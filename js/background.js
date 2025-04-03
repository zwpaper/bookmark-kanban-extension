/**
 * Background Service Worker for Bookmark Kanban
 * Copyright (c) 2025 Chen Yifeng
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { siteChecker } from './modules/siteChecker.js';

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  // Initialize extension settings
  chrome.storage.sync.get(['showOnNewTab'], (result) => {
    if (result.showOnNewTab === undefined) {
      // Set default value for new installations
      chrome.storage.sync.set({ showOnNewTab: true });
    }
  });

  scheduleNextCheck();
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_BOOKMARKS') {
    // Handle bookmark data requests
    chrome.bookmarks.getTree((tree) => {
      sendResponse({ bookmarks: tree });
    });
    return true; // Will respond asynchronously
  }
  
  if (message.type === 'UPDATE_BOOKMARK') {
    // Handle bookmark updates
    chrome.bookmarks.update(message.bookmarkId, message.changes, (bookmark) => {
      sendResponse({ success: true, bookmark });
    });
    return true;
  }
  
  if (message.type === 'DELETE_BOOKMARK') {
    // Handle bookmark deletion
    chrome.bookmarks.removeTree(message.bookmarkId, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.type === 'CREATE_BOOKMARK') {
    // Handle new bookmark creation
    chrome.bookmarks.create(message.bookmark, (bookmark) => {
      sendResponse({ success: true, bookmark });
    });
    return true;
  }

  if (message.type === 'CHECK_BOOKMARKS') {
    // 手动触发书签检测
    console.log('Manual bookmark check triggered');
    checkAllBookmarks().then(() => {
      console.log('Manual bookmark check completed successfully');
      sendResponse({ success: true });
    }).catch(error => {
      console.error('Manual check failed:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

// Listen for bookmark changes
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  // Notify all tabs about the new bookmark
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'BOOKMARK_CREATED',
        bookmark
      }).catch(() => {
        // Ignore errors for inactive tabs
      });
    });
  });
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  // Notify all tabs about the removed bookmark
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'BOOKMARK_REMOVED',
        id,
        removeInfo
      }).catch(() => {
        // Ignore errors for inactive tabs
      });
    });
  });
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  // Notify all tabs about the changed bookmark
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'BOOKMARK_CHANGED',
        id,
        changeInfo
      }).catch(() => {
        // Ignore errors for inactive tabs
      });
    });
  });
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // If the extension icon is clicked on a new tab page,
  // refresh the page to update the bookmark kanban
  if (tab.url.startsWith('chrome://newtab')) {
    chrome.tabs.reload(tab.id);
  }
});

// 初始化检测
chrome.runtime.onStartup.addListener(() => {
  scheduleNextCheck();
});

// 当浏览器空闲时执行检测
chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'idle') {
    scheduleNextCheck();
  }
});

function scheduleNextCheck() {
  // 获取上次检测时间
  chrome.storage.local.get('lastCheckTime', async (data) => {
    const lastCheck = data.lastCheckTime || 0;
    const now = Date.now();
    
    // 如果距离上次检测超过24小时，执行检测
    if (now - lastCheck >= 24 * 60 * 60 * 1000) {
      await checkAllBookmarks();
      // 更新最后检测时间
      chrome.storage.local.set({ 'lastCheckTime': now });
    }
  });
}

// 检查所有书签
async function checkAllBookmarks() {
  console.log('=== Starting bookmark check... ===');
  const bookmarks = await chrome.bookmarks.getTree();
  const results = new Map();
  let total = 0;
  let checked = 0;
  
  // 首先计算总数
  await traverseBookmarks(bookmarks, (bookmark) => {
    if (bookmark.url) total++;
  });
  
  console.log(`Found ${total} bookmarks to check`);
  
  await traverseBookmarks(bookmarks, async (bookmark) => {
    if (bookmark.url) {
      try {
        const url = new URL(bookmark.url);
        console.log(`Checking [${++checked}/${total}]: ${url.hostname}`);
        const isAlive = await siteChecker.checkSite(url.hostname);
        results.set(bookmark.id, isAlive);
        console.log(`Result for ${url.hostname}: ${isAlive ? '✅ alive' : '❌ dead'}`);
      } catch (error) {
        console.error(`Error checking bookmark: ${bookmark.url}`, error);
        results.set(bookmark.id, false); // 出错时标记为死站
        console.log(`Result for ${bookmark.url}: ❌ error`);
      }
    }
  });

  // 存储检测结果
  await chrome.storage.local.set({ 'siteStatus': Object.fromEntries(results) });
  
  // 通知所有标签页更新UI
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SITE_STATUS_UPDATED',
        siteStatus: Object.fromEntries(results)
      }).catch(() => {
        // 忽略非活动标签页的错误
      });
    });
  });
  
  console.log(`=== Bookmark check completed. Checked ${checked} bookmarks ===`);
}

// 遍历书签的辅助函数
async function traverseBookmarks(bookmarks, callback) {
  for (const bookmark of bookmarks) {
    if (bookmark.children) {
      await traverseBookmarks(bookmark.children, callback);
    } else {
      await callback(bookmark);
    }
  }
} 