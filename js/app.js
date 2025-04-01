// js/app.js
import { BookmarkManager } from './modules/bookmarkManager.js';
import { UIManager } from './modules/uiManager.js';
import { ModalManager } from './modules/modalManager.js';
import { DragManager } from './modules/dragManager.js';
import { faviconLoader } from './modules/faviconLoader.js';
import { storageManager } from './modules/storageManager.js';
import { themeManager } from './modules/themeManager.js';

export class App {
  constructor() {
    this._isDeleteOperation = false;
    this.initialize();
    this.faviconObserver = null;
    
    // Make app instance globally accessible for component interaction
    window.app = this;
  }

  async initialize() {
    try {
      // Initialize theme manager
      this.themeManager = themeManager;
      
      // Initialize various managers
      this.bookmarkManager = new BookmarkManager();
      this.uiManager = new UIManager(this.bookmarkManager);
      this.modalManager = new ModalManager(this.bookmarkManager, this.uiManager);
      this.dragManager = new DragManager(this.bookmarkManager, this.uiManager);

      // Set general change listener
      this.bookmarkManager.setChangeListener(() => this.handleBookmarksChange());
      
      // Set delete-specific listener
      this.bookmarkManager.setRemoveListener((id) => {
        // Directly handle DOM, without triggering full refresh
        const bookmarkItem = document.querySelector(`[data-bookmark-id="${id}"]`);
        if (bookmarkItem) {
          bookmarkItem.style.transition = 'opacity 0.3s ease';
          bookmarkItem.style.opacity = '0';
          setTimeout(() => {
            bookmarkItem.remove();
            // Update bookmark order storage after deletion
            this.dragManager.saveBookmarkOrder();
          }, 300);
        }
      });

      // Listen for messages from the extension
      this.setupMessageListeners();

      // Check if new tab feature is enabled
      const enabled = await this.checkNewTabEnabled();
      if (!enabled) {
        this.showDisabledMessage();
        return;
      }

      // Show loading status
      this.uiManager.showLoading();
      
      // Render board
      await this.uiManager.renderKanban();
      
      // Initialize drag functionality
      this.dragManager.initialize();

      // Add global event listeners
      this.setupEventListeners();

      // Initialize icon lazy loading
      this.initializeFaviconLoading();

    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showErrorMessage();
    }
  }

  /**
   * Set message listeners, especially for theme change messages
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'THEME_CHANGED') {
        // Apply new theme
        this.themeManager.applyTheme(message.theme);
        sendResponse({ success: true });
      }
      // Return true to indicate asynchronous response
      return true;
    });
  }

  /**
   * Check if new tab feature is enabled
   */
  async checkNewTabEnabled() {
    return new Promise(resolve => {
      chrome.storage.sync.get(['showOnNewTab'], result => {
        resolve(result.showOnNewTab !== false); // Default to true
      });
    });
  }

  /**
   * Set global event listeners
   */
  setupEventListeners() {
    // Use event delegation to handle bookmark operations
    document.addEventListener('click', (e) => {
      // If dragging, do not process click events
      if (this.dragManager && this.dragManager.isDragging) {
        return;
      }
      
      const target = e.target;
      
      // Handle edit button click
      if (target.closest('.edit-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const bookmarkItem = target.closest('.bookmark-item');
        if (bookmarkItem) {
          this.handleEditClick(bookmarkItem);
        }
      }
      
      // Handle delete button click
      if (target.closest('.delete-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const bookmarkItem = target.closest('.bookmark-item');
        if (bookmarkItem) {
          this.handleDeleteClick(bookmarkItem);
        }
      }
    });

    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + F trigger search (can be implemented in the future)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        // this.handleSearch();
      }
      
      // Ctrl/Cmd + S manually save current layout
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveCurrentLayout();
      }
    });
  }

  /**
   * Save current layout
   */
  saveCurrentLayout() {
    if (this.dragManager) {
      this.dragManager.saveColumnOrder();
      this.dragManager.saveBookmarkOrder();
      
      // Show save success notification
      this.showToast('Layout saved successfully');
    }
  }

  /**
   * Show short notification message
   */
  showToast(message, type = 'success') {
    // Create message element
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
    
    // Add to page
    document.body.appendChild(toast);
    
    // Fade in effect
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 10);
    
    // Fade out and remove after 3 seconds
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
   * Handle edit button click
   */
  async handleEditClick(bookmarkItem) {
    const bookmarkId = bookmarkItem.dataset.bookmarkId;
    try {
      const [bookmark] = await chrome.bookmarks.get(bookmarkId);
      this.modalManager.showEditModal(bookmark);
    } catch (error) {
      console.error('Failed to get bookmark:', error);
    }
  }

  /**
   * Handle delete button click
   */
  async handleDeleteClick(bookmarkItem) {
    const bookmarkId = bookmarkItem.dataset.bookmarkId;
    try {
      const [bookmark] = await chrome.bookmarks.get(bookmarkId);
      this.modalManager.showConfirmModal(bookmark);
    } catch (error) {
      console.error('Failed to get bookmark:', error);
      this.showToast('Failed to retrieve bookmark information', 'error');
    }
  }

  /**
   * Handle bookmark changes
   */
  handleBookmarksChange() {
    if (this._bookmarkChangeTimer) {
      clearTimeout(this._bookmarkChangeTimer);
    }
    
    this._bookmarkChangeTimer = setTimeout(async () => {
      try {
        // If dragging, do not update
        if (this.dragManager && this.dragManager.isDragging) {
          return;
        }
        
        console.log('Processing bookmark changes, re-rendering board');
        
        // Save current scroll position
        const scrollPosition = window.scrollY;
        
        // Destroy drag instance before re-rendering
        if (this.dragManager) {
          this.dragManager.destroy();
        }
        
        // Re-render
        await this.uiManager.renderKanban();
        
        // Re-initialize drag
        if (this.dragManager) {
          this.dragManager.initialize();
        }

        this.initializeFaviconLoading();
        
        // Save new layout
        this.dragManager.saveColumnOrder();
        this.dragManager.saveBookmarkOrder();

        // Use setTimeout and requestAnimationFrame to ensure DOM is updated
        setTimeout(() => {
          requestAnimationFrame(() => {
            // Restore scroll position
            window.scrollTo(0, scrollPosition);
          });
        }, 100);
        
      } catch (error) {
        console.error('Error processing bookmark changes:', error);
      }
    }, 300);
  }

  /**
   * Show disabled feature message
   */
  showDisabledMessage() {
    const container = document.getElementById('kanban-container');
    container.innerHTML = `
      <div class="message-container">
        <h2>Bookmark Kanban Disabled</h2>
        <p>You can enable this feature in the extension settings.</p>
      </div>
    `;
  }

  /**
   * Show error message
   */
  showErrorMessage() {
    const container = document.getElementById('kanban-container');
    container.innerHTML = `
      <div class="message-container error">
        <h2>Error</h2>
        <p>Failed to load bookmark kanban. Please refresh the page.</p>
      </div>
    `;
  }

  /**
   * Initialize icon lazy loading
   */
  initializeFaviconLoading() {
    if (this.faviconObserver) {
      this.faviconObserver.disconnect();
      this.faviconObserver = null;
    }
    
    // Use new icon loader
    faviconLoader.initialize();
  }
  
  /**
   * Reset all layout data
   */
  resetLayout() {
    storageManager.clearAllOrderData();
    location.reload();
  }

  /**
   * Switch theme
   * @param {string} theme Theme name
   */
  async switchTheme(theme) {
    try {
      await this.themeManager.switchTheme(theme);
      this.showToast(`Theme switched to ${theme}`);
      return true;
    } catch (error) {
      console.error('Failed to switch theme:', error);
      this.showToast('Failed to switch theme', 'error');
      return false;
    }
  }
} 