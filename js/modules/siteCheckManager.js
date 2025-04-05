export class SiteCheckManager {
  constructor(app) {
    this.app = app;
  }

  async handleSiteCheck() {
    const checkButton = document.getElementById('check-sites-button');
    
    // 防止多次点击
    if (checkButton.classList.contains('checking')) {
      return;
    }
    
    try {
      // 发送消息到后台服务
      await chrome.runtime.sendMessage({ 
        type: 'CHECK_BOOKMARKS'
      });
    } catch (error) {
      console.error('Site check error:', error);
      this.app.notificationManager.showErrorToast('An error occurred during bookmark check');
      
      // 恢复按钮状态
      const checkButton = document.getElementById('check-sites-button');
      const progressElement = checkButton.querySelector('.check-progress');
      if (checkButton && progressElement) {
        checkButton.classList.remove('checking');
        progressElement.style.display = 'none';
        checkButton.title = "Check bookmarks availability";
      }
    }
  }

  updateBookmarkStatus(siteStatus) {
    const bookmarkItems = document.querySelectorAll('.bookmark-item');
    bookmarkItems.forEach(item => {
      const bookmarkId = item.dataset.bookmarkId;
      const status = siteStatus[bookmarkId];
      
      if (status === false) {
        // 完全无法访问
        item.setAttribute('data-site-status', 'dead');
      } else if (status === 'certificate-error') {
        // 证书错误但域名存在
        item.setAttribute('data-site-status', 'cert-error');
      } else if (status === 'no-https') {
        // 只支持 HTTP 访问
        item.setAttribute('data-site-status', 'no-https');
      } else {
        // 完全可用
        item.removeAttribute('data-site-status');
      }
    });
  }

  handleCheckStarted(total) {
    const checkButton = document.getElementById('check-sites-button');
    const progressElement = checkButton.querySelector('.check-progress');
    
    checkButton.classList.add('checking');
    progressElement.style.display = 'inline-block';
    progressElement.textContent = `0/${total}`;
  }

  handleCheckProgress(checked, total, current) {
    const checkButton = document.getElementById('check-sites-button');
    const progressElement = checkButton.querySelector('.check-progress');
    
    progressElement.textContent = `${checked}/${total}`;
    checkButton.title = `Checking: ${current}`;
  }

  handleCheckCompleted(siteStatus) {
    const checkButton = document.getElementById('check-sites-button');
    const progressElement = checkButton.querySelector('.check-progress');
    
    checkButton.classList.remove('checking');
    progressElement.style.display = 'none';
    checkButton.title = "Check bookmarks availability";
    
    // 更新 UI 以反映检查结果
    this.updateBookmarkStatus(siteStatus);
    
    // 显示完成消息
    const deadLinks = Object.values(siteStatus).filter(status => !status).length;
    this.app.notificationManager.showToast(`Bookmark check completed! ${deadLinks} dead links found.`);
  }

  handleCheckFailed(errorMessage) {
    const checkButton = document.getElementById('check-sites-button');
    const progressElement = checkButton.querySelector('.check-progress');
    
    checkButton.classList.remove('checking');
    progressElement.style.display = 'none';
    checkButton.title = "Check bookmarks availability";
    
    this.app.notificationManager.showErrorToast(`Bookmark check failed: ${errorMessage}`);
  }
} 