// js/popup.js
import { storageManager } from './modules/storageManager.js';
import { themeManager } from './modules/themeManager.js';

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
    
    const themeSelector = document.getElementById('theme-selector');
    themeSelector.value = themeManager.getCurrentTheme();
    
    document.documentElement.setAttribute('data-theme', themeManager.getCurrentTheme());

    // Load display mode settings
    this.loadDisplayModeSettings();
  }

  /**
   * Load display mode settings
   */
  loadDisplayModeSettings() {
    chrome.storage.sync.get(['bookmark_board_display_mode'], result => {
      const displayModeSelector = document.getElementById('display-mode-selector');
      if (displayModeSelector) {
        displayModeSelector.value = result.bookmark_board_display_mode || 'double';
      }
    });
  }

  /**
   * Handle theme change
   * @param {string} theme Theme name
   */
  async handleThemeChange(theme) {
    try {
      document.documentElement.setAttribute('data-theme', theme === 'default' ? '' : theme);
      
      const success = await themeManager.switchTheme(theme);
      
      if (success) {
        this.showToast('Theme updated');
        
        const tabs = await chrome.tabs.query({ url: 'chrome://newtab/*' });
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { type: 'THEME_CHANGED', theme }).catch(() => {
            // Ignore tabs that cannot communicate
          });
        });
      } else {
        this.showToast('Failed to update theme', 'error');
      }
    } catch (error) {
      console.error('Failed to change theme:', error);
      this.showToast('Failed to update theme', 'error');
    }
  }

  /**
   * Handle display mode change
   * @param {string} mode Display mode name
   */
  async handleDisplayModeChange(mode) {
    try {
      await chrome.storage.sync.set({ 'bookmark_board_display_mode': mode });
      
      this.showToast('Display mode updated');
      
      const tabs = await chrome.tabs.query({ url: 'chrome://newtab/*' });
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'DISPLAY_MODE_CHANGED', mode }).catch(() => {
          // Ignore tabs that cannot communicate
        });
      });
    } catch (error) {
      console.error('Failed to change display mode:', error);
      this.showToast('Failed to update display mode', 'error');
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