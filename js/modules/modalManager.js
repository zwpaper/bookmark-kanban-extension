import { createElement } from './utils.js';

export class ModalManager {
  constructor(bookmarkManager, uiManager, app) {
    this.bookmarkManager = bookmarkManager;
    this.uiManager = uiManager;
    this.app = app;
    this.activeModal = null;
    this.initializeModals();
  }

  /**
   * Initialize modals
   */
  initializeModals() {
    // Create edit modal
    this.editModal = this.createEditModal();
    // Create confirm delete modal
    this.confirmModal = this.createConfirmModal();
    
    // Add to document
    document.body.appendChild(this.editModal);
    document.body.appendChild(this.confirmModal);
    
    // Bind global click event for closing modals
    document.addEventListener('click', (e) => {
      // 只有当点击模态框的背景区域时才关闭
      if (e.target.classList.contains('modal') && !e.target.closest('.modal-content')) {
        this.closeActiveModal();
      }
    });

    // Bind ESC key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.closeActiveModal();
      }
    });
  }

  /**
   * Create edit modal
   * @returns {HTMLElement} Modal element
   */
  createEditModal() {
    const modal = createElement('div', 'modal');
    modal.id = 'editModal';
    
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Edit Bookmark</h2>
        <form id="editBookmarkForm">
          <div class="form-group">
            <label for="bookmarkTitle">Title</label>
            <input type="text" id="bookmarkTitle" required>
          </div>
          <div class="form-group">
            <label for="bookmarkUrl">URL</label>
            <input type="url" id="bookmarkUrl" required>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-cancel">Cancel</button>
            <button type="submit" class="btn-save">Save</button>
          </div>
        </form>
      </div>
    `;

    return modal;
  }

  /**
   * Create confirm delete modal
   * @returns {HTMLElement} Modal element
   */
  createConfirmModal() {
    const modal = createElement('div', 'modal');
    modal.id = 'confirmModal';
    
    modal.innerHTML = `
      <div class="modal-content confirm-content">
        <h2>Delete Bookmark</h2>
        <p class="confirm-message">Are you sure you want to delete "<span id="deleteBookmarkTitle"></span>"?</p>
        <div class="form-actions">
          <button type="button" class="btn-cancel">Cancel</button>
          <button type="button" class="btn-delete">Delete</button>
        </div>
      </div>
    `;

    return modal;
  }

  /**
   * Show edit modal
   * @param {Object} bookmark Bookmark data
   */
  showEditModal(bookmark) {
    const modal = this.editModal;
    const form = modal.querySelector('#editBookmarkForm');
    const titleInput = modal.querySelector('#bookmarkTitle');
    const urlInput = modal.querySelector('#bookmarkUrl');
    
    // Fill current values
    titleInput.value = bookmark.title;
    urlInput.value = bookmark.url;
    
    // Bind form submit event
    form.onsubmit = async (e) => {
      e.preventDefault();
      await this.handleBookmarkEdit(bookmark.id, {
        title: titleInput.value,
        url: urlInput.value
      });
    };
    
    // Bind cancel button
    modal.querySelector('.btn-cancel').onclick = () => this.closeActiveModal();
    
    this.showModal(modal);
    titleInput.focus();
  }

  /**
   * Show confirm delete modal
   * @param {Object} bookmark Bookmark data
   */
  showConfirmModal(bookmark) {
    const modal = this.confirmModal;
    
    // 设置确认消息
    const titleSpan = modal.querySelector('#deleteBookmarkTitle');
    titleSpan.textContent = bookmark.title;
    
    // 获取按钮元素
    const confirmBtn = modal.querySelector('.btn-delete');
    const cancelBtn = modal.querySelector('.btn-cancel');
    
    // 移除现有的事件监听器
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    // 绑定新的删除事件
    newConfirmBtn.addEventListener('click', async () => {
      try {
        newConfirmBtn.disabled = true;
        newConfirmBtn.textContent = 'Deleting...';
        
        // 保存当前滚动位置
        const scrollPosition = window.scrollY;
        console.log("删除前滚动位置:", scrollPosition);
        
        // 执行删除操作
        await this.bookmarkManager.deleteBookmark(bookmark.id);
        
        // 关闭模态框
        this.closeActiveModal();
        
        // 显示成功消息
        this.showToast('Bookmark deleted');
        
        // 重要：停止可能的全局刷新
        // 使用直接DOM操作而不是触发完整的刷新
        const bookmarkItem = document.querySelector(`[data-bookmark-id="${bookmark.id}"]`);
        if (bookmarkItem) {
          bookmarkItem.style.transition = 'opacity 0.3s ease';
          bookmarkItem.style.opacity = '0';
          
          setTimeout(() => {
            // 在元素淡出后移除它
            bookmarkItem.remove();
            
            // 更新书签顺序存储
            if (window.app && window.app.dragManager) {
              window.app.dragManager.saveBookmarkOrder();
            }
            
            // 更可靠地恢复滚动位置 - 使用多次尝试确保成功
            const restoreScroll = () => {
              console.log("尝试恢复到滚动位置:", scrollPosition);
              window.scrollTo(0, scrollPosition);
            };
            
            // 立即尝试一次
            restoreScroll();
            
            // 然后再尝试几次，以确保能成功
            setTimeout(restoreScroll, 50);
            setTimeout(restoreScroll, 150);
            
            // 最后一次使用requestAnimationFrame确保在渲染后恢复
            setTimeout(() => {
              requestAnimationFrame(restoreScroll);
            }, 300);
          }, 300);
        }
        
      } catch (error) {
        console.error('Failed to delete bookmark:', error);
        this.showToast('Failed to delete bookmark: ' + (error.message || 'Unknown error'), 'error');
      } finally {
        if (newConfirmBtn) {
          newConfirmBtn.disabled = false;
          newConfirmBtn.textContent = 'Delete';
        }
      }
    });
    
    // 绑定取消事件
    newCancelBtn.addEventListener('click', () => {
      this.closeActiveModal();
    });
    
    // 显示模态框
    this.showModal(modal);
  }

  /**
   * Show short notification message
   * @param {string} message Message content
   * @param {string} type Message type (info, success, error)
   */
  showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '10px 15px';
    toast.style.backgroundColor = type === 'error' ? '#f44336' : '#4caf50';
    toast.style.color = 'white';
    toast.style.borderRadius = '4px';
    toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    toast.style.zIndex = '9999';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    
    // Add to document
    document.body.appendChild(toast);
    
    // Show animation
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 10);
    
    // Auto dismiss
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
   * Handle bookmark edit
   * @param {string} id Bookmark ID
   * @param {Object} changes Changes to apply
   */
  async handleBookmarkEdit(id, changes) {
    try {
      const updatedBookmark = await this.bookmarkManager.updateBookmark(id, changes);
      this.uiManager.updateBookmarkItem(updatedBookmark);
      this.closeActiveModal();
    } catch (error) {
      console.error('Failed to update bookmark:', error);
      this.showError('Failed to update bookmark, please try again');
    }
  }

  /**
   * Show modal
   * @param {HTMLElement} modal Modal element
   */
  showModal(modal) {
    this.activeModal = modal;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  /**
   * Close current active modal
   */
  closeActiveModal() {
    if (this.activeModal) {
      try {
        // Reset all button states
        const buttons = this.activeModal.querySelectorAll('button');
        buttons.forEach(button => {
          button.disabled = false;
          if (button.classList.contains('btn-delete')) {
            button.textContent = 'Delete';
          }
        });
        
        this.activeModal.classList.remove('show');
        document.body.style.overflow = '';
        this.activeModal = null;
      } catch (error) {
        console.error('Error closing modal:', error);
      }
    }
  }

  /**
   * Show error message
   * @param {string} message Error message
   */
  showError(message) {
    // Can implement better error UI as needed
    alert(message);
  }
} 