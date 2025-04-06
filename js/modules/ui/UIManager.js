import { formatDateTime } from '../utils.js';
import { BookmarkRenderer } from './BookmarkRenderer.js';
import { ColumnManager } from './ColumnManager.js';
import { KanbanRenderer } from './KanbanRenderer.js';
import { NotificationService } from './NotificationService.js';
import { UIStateManager } from './UIStateManager.js';
import { themeManager } from '../themeManager.js';

export class UIManager {
  constructor(bookmarkManager) {
    this.bookmarkManager = bookmarkManager;
    this.container = document.getElementById('kanban-container');
    
    // Initialize services
    this.notificationService = new NotificationService();
    this.uiStateManager = new UIStateManager(this.container);
    
    // Initialize renderers in correct order
    this.bookmarkRenderer = new BookmarkRenderer();
    this.columnManager = new ColumnManager(this.bookmarkManager, this.notificationService);
    this.columnManager.setBookmarkRenderer(this.bookmarkRenderer);
    
    // Initialize kanban renderer with all required dependencies
    this.kanbanRenderer = new KanbanRenderer(
      this.bookmarkManager,
      this.columnManager,
      this.bookmarkRenderer
    );
    
    // Initialize UI components
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
   * Initialize theme selector
   */
  initializeThemeSelector() {
    const themeSelector = document.getElementById('theme-selector');
    if (!themeSelector) return;
    
    // Set current theme
    themeSelector.value = themeManager.getCurrentTheme();
    
    // Add change event listener
    themeSelector.addEventListener('change', (e) => {
      const newTheme = e.target.value;
      this.handleThemeChange(newTheme);
    });
  }

  /**
   * Handle theme change
   * @param {string} theme Theme name
   */
  async handleThemeChange(theme) {
    try {
      const success = await themeManager.switchTheme(theme);
      if (success) {
        this.notificationService.showToast('Theme updated successfully', 'success');
      } else {
        this.notificationService.showToast('Theme update failed', 'error');
      }
    } catch (error) {
      console.error('Theme switch failed:', error);
      this.notificationService.showToast('Theme update failed', 'error');
    }
  }

  /**
   * Render the kanban board
   */
  async renderKanban() {
    try {
      // Clear container
      this.container.innerHTML = '';
      
      // Get bookmark tree
      const bookmarkTree = await this.bookmarkManager.getBookmarkTree();
      
      // Render board
      await this.kanbanRenderer.renderBoard(this.container, bookmarkTree);
      
    } catch (error) {
      console.error('Failed to render kanban:', error);
      this.uiStateManager.showError('Failed to load bookmarks');
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.uiStateManager.showLoading();
  }

  /**
   * Show error message
   */
  showErrorMessage() {
    this.uiStateManager.showError('An error occurred while loading bookmarks');
  }

  /**
   * Show disabled message
   */
  showDisabledMessage() {
    this.uiStateManager.showDisabledMessage();
  }

  /**
   * Remove a bookmark item from the UI
   * @param {string} bookmarkId Bookmark ID to remove
   */
  removeBookmarkItem(bookmarkId) {
    this.bookmarkRenderer.removeBookmarkItem(bookmarkId);
  }

  /**
   * Update a bookmark item in the UI
   * @param {Object} bookmark Bookmark data
   */
  updateBookmarkItem(bookmark) {
    this.bookmarkRenderer.updateBookmarkItem(bookmark);
  }

  /**
   * Show drag guide for new users
   */
  showDragGuide() {
    this.uiStateManager.showDragGuide();
  }
} 