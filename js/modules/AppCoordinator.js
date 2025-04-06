export class AppCoordinator {
  async initialize() {
    try {
      // 初始化主题管理器
      this.themeManager = themeManager;
      await this.themeManager.initializeTheme();
      
      // 初始化显示模式管理器
      this.displayManager = displayManager;
      await this.displayManager.initializeDisplayMode();
      
      // 初始化书签管理器
      this.bookmarkManager = new BookmarkManager();
      
      // 初始化 UI 管理器
      this.uiManager = new UIManager(this.bookmarkManager);
      
      // 初始化模态框管理器 - 确保传递 app 引用
      this.modalManager = new ModalManager(this.bookmarkManager, this.uiManager, this);
      
      // 初始化拖拽管理器
      this.dragManager = new DragManager(this.bookmarkManager, this.uiManager);
      
      // 初始化命令面板
      this.commandPalette = new CommandPalette(this.bookmarkManager);
      await this.commandPalette.initialize();
      
      // 初始化事件管理器
      this.eventManager = new EventManager(this);
      
      // 初始化消息处理器
      this.messageHandler = new MessageHandler(this);
      
      // 初始化站点检查管理器
      this.siteCheckManager = new SiteCheckManager(this);
      
      // 初始化通知管理器
      this.notificationManager = new NotificationManager();

      // 显示加载状态
      this.uiManager.showLoading();
      
      // 设置书签变更监听器
      this.bookmarkManager.setChangeListener(() => this.handleBookmarksChange());
      this.bookmarkManager.setRemoveListener((id) => {
        // 直接处理 DOM，不触发完整刷新
        const bookmarkItem = document.querySelector(`[data-bookmark-id="${id}"]`);
        if (bookmarkItem) {
          bookmarkItem.style.transition = 'opacity 0.3s ease';
          bookmarkItem.style.opacity = '0';
          setTimeout(() => {
            bookmarkItem.remove();
            // 删除后更新书签顺序存储
            this.dragManager.saveBookmarkOrder();
          }, 300);
        }
      });
      
      // 渲染看板
      await this.uiManager.renderKanban();
      
      // 初始化拖拽功能
      this.dragManager.initialize();

      // 添加全局事件监听器
      this.eventManager.setupEventListeners();

      // 初始化图标懒加载
      this.initializeFaviconLoading();

    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.uiManager.showErrorMessage();
    }
  }
} 