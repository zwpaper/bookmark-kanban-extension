export class EventManager {
  constructor(app) {
    this.app = app;
  }

  setupEventListeners() {
    this.setupDocumentListeners();
    this.setupKeyboardShortcuts();
  }

  setupDocumentListeners() {
    document.addEventListener('click', (e) => {
      // 如果正在拖拽，不处理点击事件
      if (this.app.dragManager && this.app.dragManager.isDragging) {
        return;
      }
      
      const target = e.target;
      
      // 处理检查站点按钮点击
      if (target.closest('#check-sites-button')) {
        e.preventDefault();
        e.stopPropagation();
        this.app.siteCheckManager.handleSiteCheck();
        return;
      }
      
      // 处理设置按钮点击
      if (target.closest('#settings-button')) {
        e.preventDefault();
        e.stopPropagation();
        this.app.modalManager.showSettingsModal();
        return;
      }
      
      // 处理编辑按钮点击
      if (target.closest('.edit-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const bookmarkItem = target.closest('.bookmark-item');
        if (bookmarkItem) {
          this.handleEditClick(bookmarkItem);
        }
      }
      
      // 处理删除按钮点击
      if (target.closest('.delete-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const bookmarkItem = target.closest('.bookmark-item');
        if (bookmarkItem) {
          this.handleDeleteClick(bookmarkItem);
        }
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + F 触发搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
      }
      
      // Ctrl/Cmd + S 手动保存当前布局
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveCurrentLayout();
      }
    });
  }

  async handleEditClick(bookmarkItem) {
    const bookmarkId = bookmarkItem.dataset.bookmarkId;
    try {
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        const [bookmark] = await chrome.bookmarks.get(bookmarkId);
        this.app.modalManager.showEditModal(bookmark);
      } else {
        console.error('Chrome bookmarks API is not available');
      }
    } catch (error) {
      console.error('Failed to get bookmark:', error);
    }
  }

  async handleDeleteClick(bookmarkItem) {
    const bookmarkId = bookmarkItem.dataset.bookmarkId;
    try {
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        const [bookmark] = await chrome.bookmarks.get(bookmarkId);
        this.app.modalManager.showConfirmModal(bookmark);
      } else {
        console.error('Chrome bookmarks API is not available');
      }
    } catch (error) {
      console.error('Failed to get bookmark:', error);
      if (this.app.notificationManager) {
        this.app.notificationManager.showErrorToast('Failed to retrieve bookmark information');
      }
    }
  }
  
  saveCurrentLayout() {
    if (this.app.dragManager) {
      this.app.dragManager.saveColumnOrder();
      this.app.dragManager.saveBookmarkOrder();
      if (this.app.notificationManager) {
        this.app.notificationManager.showToast('Layout saved successfully');
      }
    }
  }
} 