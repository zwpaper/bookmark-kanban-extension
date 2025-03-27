// js/popup.js
import { storageManager } from './modules/storageManager.js';

class PopupManager {
  constructor() {
    this.initialize();
  }

  initialize() {
    this.loadSettings();
    this.setupEventListeners();
  }

  /**
   * Load settings
   */
  loadSettings() {
    chrome.storage.sync.get(['showOnNewTab'], result => {
      const checkbox = document.getElementById('show-on-newtab');
      checkbox.checked = result.showOnNewTab !== false;
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // New tab display settings
    const checkbox = document.getElementById('show-on-newtab');
    checkbox.addEventListener('change', (e) => {
      this.saveSettings(e.target.checked);
    });

    // Refresh button
    const refreshButton = document.getElementById('refresh-bookmarks');
    refreshButton.addEventListener('click', () => {
      this.handleRefresh();
    });

    // Reset layout button
    const resetButton = document.getElementById('reset-layout');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.handleResetLayout();
      });
    }

    // Version info click
    const versionInfo = document.querySelector('.version-info');
    if (versionInfo) {
      versionInfo.addEventListener('click', () => {
        this.showAboutDialog();
      });
    }
  }

  /**
   * Save settings
   */
  async saveSettings(showOnNewTab) {
    try {
      await chrome.storage.sync.set({ showOnNewTab });
      this.showSaveSuccess();
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showSaveError();
    }
  }

  /**
   * Handle refresh operation
   */
  async handleRefresh() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (currentTab.url.startsWith('chrome://newtab')) {
        await chrome.tabs.reload(currentTab.id);
        window.close();
      } else {
        this.showRefreshHint();
      }
    } catch (error) {
      console.error('Failed to refresh:', error);
      this.showRefreshError();
    }
  }

  /**
   * Handle reset layout operation
   */
  async handleResetLayout() {
    try {
      // Confirmation dialog
      if (confirm('Are you sure you want to reset the board layout? This will restore the default order of columns and bookmarks.')) {
        // Clear all layout data
        storageManager.clearAllOrderData();
        
        // Refresh current tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        
        if (currentTab.url.startsWith('chrome://newtab')) {
          await chrome.tabs.reload(currentTab.id);
        }
        
        this.showToast('Layout has been reset');
        
        // Close popup window
        setTimeout(() => window.close(), 1500);
      }
    } catch (error) {
      console.error('Failed to reset layout:', error);
      this.showToast('Failed to reset layout', 'error');
    }
  }

  /**
   * Show save success message
   */
  showSaveSuccess() {
    this.showToast('Settings saved');
  }

  /**
   * Show save error message
   */
  showSaveError() {
    this.showToast('Failed to save settings', 'error');
  }

  /**
   * Show refresh hint message
   */
  showRefreshHint() {
    this.showToast('Please check the new tab page for updates');
  }

  /**
   * Show refresh error message
   */
  showRefreshError() {
    this.showToast('Refresh failed, please try again', 'error');
  }

  /**
   * Show toast message
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Auto dismiss
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  /**
   * Show about dialog
   */
  showAboutDialog() {
    const manifest = chrome.runtime.getManifest();
    alert(`Bookmark Kanban v${manifest.version}\n\nA simple bookmark management tool`);
  }
}

// Initialize popup manager
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});