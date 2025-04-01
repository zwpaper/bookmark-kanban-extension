import { createElement, formatDateTime, getDomain } from './utils.js';
import { faviconLoader } from './faviconLoader.js';
import { storageManager } from './storageManager.js';
import { themeManager } from './themeManager.js';

export class UIManager {
  constructor(bookmarkManager) {
    this.bookmarkManager = bookmarkManager;
    this.container = document.getElementById('kanban-container');
    this.initializeTimeUpdate();
    this.initializeThemeSelector();
  }

  /**
   * Initialize time update
   */
  initializeTimeUpdate() {
    const updateDateTime = () => {
      const { time, date } = formatDateTime(new Date());
      document.getElementById('current-time').textContent = time;
      document.getElementById('current-date').textContent = date;
    };

    updateDateTime();
    setInterval(updateDateTime, 1000);
  }

  /**
   * 初始化主题选择器
   */
  initializeThemeSelector() {
    const themeSelector = document.getElementById('theme-selector');
    if (!themeSelector) return;
    
    // 设置当前主题
    themeSelector.value = themeManager.getCurrentTheme();
    
    // 添加变更事件监听器
    themeSelector.addEventListener('change', (e) => {
      const newTheme = e.target.value;
      this.handleThemeChange(newTheme);
    });
  }

  /**
   * 处理主题变更
   * @param {string} theme 主题名称
   */
  async handleThemeChange(theme) {
    try {
      const success = await themeManager.switchTheme(theme);
      if (success) {
        this.showThemeToast('主题已更新', 'success');
      } else {
        this.showThemeToast('主题更新失败', 'error');
      }
    } catch (error) {
      console.error('切换主题失败:', error);
      this.showThemeToast('主题更新失败', 'error');
    }
  }

  /**
   * 显示主题切换提示
   * @param {string} message 提示信息
   * @param {string} type 提示类型
   */
  showThemeToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '10px 15px';
    toast.style.backgroundColor = type === 'error' ? '#ef4444' : '#10b981';
    toast.style.color = 'white';
    toast.style.borderRadius = '4px';
    toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    toast.style.zIndex = '9999';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 10);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Render the entire kanban board (ensures Promise return for chaining)
   */
  async renderKanban() {
    this.showLoading();
    
    const container = document.getElementById('kanban-container');
    container.innerHTML = '';
    
    const kanbanBoard = document.createElement('div');
    kanbanBoard.className = 'kanban-board';
    container.appendChild(kanbanBoard);

    try {
      // Get bookmark tree
      const bookmarkTree = await this.bookmarkManager.getBookmarkTree();
      
      // Get saved column order
      const savedColumnOrder = await storageManager.getColumnOrder();
      
      // Get saved bookmark order
      const savedBookmarkOrder = await storageManager.getBookmarkOrder();
      
      if (bookmarkTree && bookmarkTree.length > 0) {
        // Process bookmark tree and apply saved order
        await this.processBookmarkTree(bookmarkTree[0], kanbanBoard, savedColumnOrder, savedBookmarkOrder);
      }
    } catch (error) {
      console.error('Failed to render kanban:', error);
      this.showError('Failed to load bookmarks, please refresh the page');
    }
    
    return this;
  }

  /**
   * Process bookmark tree and apply saved order
   */
  async processBookmarkTree(node, container, savedColumnOrder, savedBookmarkOrder) {
    if (!node.children) return;
    
    // Prepare all column data without immediate rendering
    const columnsData = [];
    
    // Find bookmark bar
    const bookmarkBar = node.children.find(child => child.id === '1');
    if (bookmarkBar) {
      // Process folders in bookmark bar
      bookmarkBar.children.forEach(child => {
        if (child.children) { // Is a folder
          columnsData.push({
            type: 'folder',
            data: child
          });
        }
      });
      
      // Create an "Uncategorized" column for direct bookmarks in bookmark bar
      const uncategorizedBookmarks = bookmarkBar.children.filter(child => child.url);
      if (uncategorizedBookmarks.length > 0) {
        columnsData.push({
          type: 'uncategorized',
          title: 'Uncategorized',
          data: uncategorizedBookmarks
        });
      }
    }
    
    // Process "Other Bookmarks"
    const otherBookmarks = node.children.find(child => child.id === '2');
    if (otherBookmarks) {
      columnsData.push({
        type: 'special',
        data: otherBookmarks
      });
    }
    
    // Process "Mobile Bookmarks"
    const mobileBookmarks = node.children.find(child => child.id === '3');
    if (mobileBookmarks) {
      columnsData.push({
        type: 'special',
        data: mobileBookmarks
      });
    }
    
    // If there's saved column order, render according to it
    if (savedColumnOrder && savedColumnOrder.length > 0) {
      // Arrange columns according to saved order
      const orderedColumns = [];
      
      // First find all matching columns
      savedColumnOrder.forEach(columnId => {
        let matchColumn;
        
        if (columnId === 'uncategorized') {
          // Handle uncategorized column
          matchColumn = columnsData.find(col => col.type === 'uncategorized');
        } else {
          // Handle regular folders and special folders
          matchColumn = columnsData.find(col => {
            if (col.type === 'folder') return col.data.id === columnId;
            if (col.type === 'special') return col.data.id === columnId;
            return false;
          });
        }
        
        if (matchColumn) {
          orderedColumns.push(matchColumn);
        }
      });
      
      // Add columns not in saved order
      columnsData.forEach(col => {
        let columnId;
        
        if (col.type === 'uncategorized') {
          columnId = 'uncategorized';
        } else if (col.type === 'folder' || col.type === 'special') {
          columnId = col.data.id;
        }
        
        if (columnId && !savedColumnOrder.includes(columnId)) {
          orderedColumns.push(col);
        } else if (!columnId) {
          // Handle special columns
          orderedColumns.push(col);
        }
      });
      
      // Render ordered columns
      orderedColumns.forEach(col => {
        this.renderColumn(col, container, savedBookmarkOrder);
      });
    } else {
      // If no saved order, render in original order
      columnsData.forEach(col => {
        this.renderColumn(col, container, savedBookmarkOrder);
      });
    }
  }
  
  /**
   * Render a single column
   */
  renderColumn(columnData, container, savedBookmarkOrder) {
    switch(columnData.type) {
      case 'folder':
        this.processBookmarkFolder(columnData.data, container, savedBookmarkOrder);
        break;
      case 'uncategorized':
        this.createBookmarkColumn(columnData.title, columnData.data, container, null, savedBookmarkOrder);
        break;
      case 'special':
        this.createBookmarkColumn(columnData.data.title, columnData.data.children || [], container, columnData.data.id, savedBookmarkOrder);
        break;
    }
  }

  /**
   * Process bookmark folder
   */
  processBookmarkFolder(folder, container, savedBookmarkOrder) {
    const column = document.createElement('div');
    column.className = 'kanban-column';
    column.dataset.folderId = folder.id;
    
    // Create column header
    const header = document.createElement('div');
    header.className = 'column-header';

    // Add drag handle
    const dragHandle = document.createElement('div');
    dragHandle.className = 'column-drag-handle';
    dragHandle.innerHTML = '⠿';  // Simple drag icon
    dragHandle.title = 'Drag to reorder';
    header.appendChild(dragHandle);
    
    const title = document.createElement('div');
    title.className = 'column-title';
    title.textContent = folder.title;
    header.appendChild(title);
    
    // Add bookmark count
    const bookmarkCount = this.countBookmarksInFolder(folder);
    const count = document.createElement('div');
    count.className = 'bookmark-count';
    count.textContent = bookmarkCount;
    header.appendChild(count);
    
    column.appendChild(header);
    
    // Create bookmark list
    const bookmarkList = document.createElement('div');
    bookmarkList.className = 'bookmark-list';
    
    if (folder.children) {
      // Check if there's saved bookmark order
      if (savedBookmarkOrder && savedBookmarkOrder[folder.id]) {
        // Arrange bookmarks according to saved order
        this.renderOrderedBookmarks(folder.children, bookmarkList, savedBookmarkOrder[folder.id]);
      } else {
        // Render bookmarks in original order
        folder.children.forEach(child => {
          if (child.url) {
            const bookmarkItem = this.createBookmarkItem(child);
            bookmarkList.appendChild(bookmarkItem);
          }
        });
      }
    }
    
    column.appendChild(bookmarkList);
    container.appendChild(column);
  }

  /**
   * Render bookmarks according to saved order
   */
  renderOrderedBookmarks(bookmarks, container, savedOrder) {
    // Create a bookmark map for quick lookup by id
    const bookmarkMap = {};
    bookmarks.forEach(bookmark => {
      if (bookmark.url) {
        bookmarkMap[bookmark.id] = bookmark;
      }
    });
    
    // Add bookmarks in saved order
    savedOrder.forEach(bookmarkId => {
      if (bookmarkMap[bookmarkId]) {
        const bookmarkItem = this.createBookmarkItem(bookmarkMap[bookmarkId]);
        container.appendChild(bookmarkItem);
        // Remove from map to avoid duplicate addition
        delete bookmarkMap[bookmarkId];
      }
    });
    
    // Add any bookmarks not in saved order
    Object.values(bookmarkMap).forEach(bookmark => {
      const bookmarkItem = this.createBookmarkItem(bookmark);
      container.appendChild(bookmarkItem);
    });
  }

  /**
   * Create bookmark column
   */
  createBookmarkColumn(title, bookmarks, container, folderId, savedBookmarkOrder) {
    const column = document.createElement('div');
    column.className = 'kanban-column';
    
    // Handle special column types
    if (folderId) {
      column.dataset.folderId = folderId;
    } else if (title === 'Uncategorized') {
      // Mark uncategorized column with a special attribute
      column.dataset.columnType = 'uncategorized';
    }
    
    // Create column header
    const header = document.createElement('div');
    header.className = 'column-header';

    // Add drag handle
    const dragHandle = document.createElement('div');
    dragHandle.className = 'column-drag-handle';
    dragHandle.innerHTML = '⠿';  // Simple drag icon
    dragHandle.title = 'Drag to reorder';
    header.appendChild(dragHandle);
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'column-title';
    titleDiv.textContent = title;
    header.appendChild(titleDiv);
    
    // Add bookmark count
    const count = document.createElement('div');
    count.className = 'bookmark-count';
    count.textContent = bookmarks.length;
    header.appendChild(count);
    
    column.appendChild(header);
    
    // Create bookmark list
    const bookmarkList = document.createElement('div');
    bookmarkList.className = 'bookmark-list';
    
    // Determine the correct column ID for storage
    const columnStorageId = column.dataset.columnType === 'uncategorized' ? 
      'uncategorized' : folderId;
    
    // If there's saved bookmark order, render in order
    if (columnStorageId && savedBookmarkOrder && savedBookmarkOrder[columnStorageId]) {
      // Filter out direct bookmarks (not in subfolders)
      const directBookmarks = bookmarks.filter(bookmark => bookmark.url);
      this.renderOrderedBookmarks(directBookmarks, bookmarkList, savedBookmarkOrder[columnStorageId]);
      
      // Render subfolders
      bookmarks.forEach(bookmark => {
        if (bookmark.children) {
          this.renderSubfolderGroup(bookmark, bookmarkList, savedBookmarkOrder);
        }
      });
    } else {
      // Render in original order
      bookmarks.forEach(bookmark => {
        if (bookmark.url) {
          const bookmarkItem = this.createBookmarkItem(bookmark);
          bookmarkList.appendChild(bookmarkItem);
        } else if (bookmark.children) {
          this.renderSubfolderGroup(bookmark, bookmarkList, savedBookmarkOrder);
        }
      });
    }
    
    column.appendChild(bookmarkList);
    container.appendChild(column);
  }

  /**
   * Render subfolder group
   */
  renderSubfolderGroup(folder, container, savedBookmarkOrder) {
    // Don't render if subfolder has no bookmarks
    if (!folder.children || folder.children.length === 0) return;
    
    const subfolderGroup = document.createElement('div');
    subfolderGroup.className = 'subfolder-group';
    
    const subfolderTitle = document.createElement('div');
    subfolderTitle.className = 'subfolder-title';
    subfolderTitle.textContent = folder.title;
    subfolderGroup.appendChild(subfolderTitle);
    
    // If there's saved subfolder bookmark order, render in order
    const subfolderKey = `subfolder-${folder.id}`;
    if (savedBookmarkOrder && savedBookmarkOrder[subfolderKey]) {
      this.renderOrderedBookmarks(folder.children, subfolderGroup, savedBookmarkOrder[subfolderKey]);
    } else {
      // Render bookmarks in subfolder in original order
      folder.children.forEach(child => {
        if (child.url) {
          const bookmarkItem = this.createBookmarkItem(child);
          subfolderGroup.appendChild(bookmarkItem);
        }
      });
    }
    
    container.appendChild(subfolderGroup);
  }

  /**
   * Count bookmarks in folder
   */
  countBookmarksInFolder(folder) {
    let count = 0;
    if (folder.children) {
      folder.children.forEach(child => {
        if (child.url) {
          count++;
        } else if (child.children) {
          count += this.countBookmarksInFolder(child);
        }
      });
    }
    return count;
  }

  /**
   * Create a bookmark item element
   */
  createBookmarkItem(bookmark) {
    const item = createElement('div', 'bookmark-item');
    item.setAttribute('data-bookmark-id', bookmark.id);
    item.setAttribute('draggable', 'true');
    
    // Add URL as data attribute for single-line mode tooltip
    item.setAttribute('data-url', bookmark.url);
    
    const content = createElement('div', 'bookmark-content');
    
    // Create favicon container
    const faviconContainer = createElement('div', 'bookmark-favicon');
    
    // Create title element
    const title = createElement('div', 'bookmark-title');
    title.textContent = bookmark.title || '(无标题)';
    title.title = bookmark.title || bookmark.url;
    
    // Create domain element
    const domain = createElement('div', 'bookmark-domain');
    domain.textContent = getDomain(bookmark.url);
    
    // Create actions container
    const actions = createElement('div', 'bookmark-actions');
    
    // Create edit button
    const editButton = createElement('button', 'bookmark-action edit-btn');
    editButton.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>
    `;
    editButton.title = 'Edit';
    
    // Create delete button
    const deleteButton = createElement('button', 'bookmark-action delete-btn');
    deleteButton.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
      </svg>
    `;
    deleteButton.title = 'Delete';
    
    // Assemble actions
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    
    // Assemble content
    content.appendChild(faviconContainer);
    content.appendChild(title);
    content.appendChild(domain);
    
    // Assemble item
    item.appendChild(content);
    item.appendChild(actions);
    
    // Add click handler to open bookmark
    content.addEventListener('click', (e) => {
      if (!e.target.closest('.bookmark-action')) {
        window.open(bookmark.url, '_blank');
      }
    });
    
    // Load favicon
    faviconLoader.prepareIconElement(faviconContainer, bookmark.url);
    
    return item;
  }
  
  /**
   * Create empty folder message
   * @returns {HTMLElement} Message element
   */
  createEmptyMessage() {
    const empty = createElement('div', 'empty-column');
    empty.textContent = 'This folder is empty';
    return empty;
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading your bookmarks...</p>
      </div>
    `;
  }

  /**
   * Show error message
   * @param {string} message Error message
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="error-message">
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * Update column bookmark count
   * @param {string} columnId Column ID
   */
  updateColumnCount(columnId) {
    const column = document.querySelector(`.kanban-column[data-folder-id="${columnId}"]`);
    if (column) {
      const bookmarkList = column.querySelector('.bookmark-list');
      const count = column.querySelector('.bookmark-count');
      count.textContent = bookmarkList.children.length;
    }
  }

  /**
   * Update specific bookmark display
   * @param {Object} bookmark Bookmark data
   */
  updateBookmarkItem(bookmark) {
    const item = document.querySelector(`.bookmark-item[data-bookmark-id="${bookmark.id}"]`);
    if (item) {
      const title = item.querySelector('.bookmark-title');
      const favicon = item.querySelector('.bookmark-favicon');
      
      title.textContent = bookmark.title || getDomain(bookmark.url);
      faviconLoader.prepareIconElement(favicon, bookmark.url);
      item.dataset.url = bookmark.url;
    }
  }

  /**
   * Update column order without complete re-render
   * This method can be called after drag to avoid flickering from complete re-render
   */
  updateColumnOrder() {
    // Update count for all columns
    const columns = document.querySelectorAll('.kanban-column');
    columns.forEach(column => {
      this.updateColumnCount(column.dataset.folderId);
    });
    
    // Save current column order
    const dragManager = window.app && window.app.dragManager;
    if (dragManager) {
      dragManager.saveColumnOrder();
    }
  }

  /**
   * Remove single bookmark element
   * @param {string} bookmarkId Bookmark ID to remove
   */
  removeBookmarkItem(bookmarkId) {
    const bookmarkItem = document.querySelector(`.bookmark-item[data-bookmark-id="${bookmarkId}"]`);
    if (bookmarkItem) {
      bookmarkItem.style.transition = 'opacity 0.3s ease';
      bookmarkItem.style.opacity = '0';
      
      setTimeout(() => {
        bookmarkItem.remove();
        
        const column = bookmarkItem.closest('.kanban-column');
        if (column) {
          const count = column.querySelector('.bookmark-count');
          const currentCount = parseInt(count.textContent) - 1;
          count.textContent = currentCount;
          
          const bookmarkList = column.querySelector('.bookmark-list');
          if (bookmarkList && bookmarkList.children.length === 0) {
            bookmarkList.innerHTML = '<div class="empty-column">No bookmarks</div>';
          }
        }
        
        // Save current bookmark order
        const dragManager = window.app && window.app.dragManager;
        if (dragManager) {
          dragManager.saveBookmarkOrder();
        }
      }, 300);
    }
  }
}