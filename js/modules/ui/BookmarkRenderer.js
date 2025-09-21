import { createElement, getDomain, parseTitle, getTagColor } from '../utils.js';
import { faviconLoader } from '../faviconLoader.js';

export class BookmarkRenderer {
  constructor() {
    // Callbacks from outer components
    this.onBookmarkOrderChanged = null;
    this.openInNewTab = true;
  }

  /**
   * Set callback for when bookmark order changes
   * @param {Function} callback Callback function
   */
  setOrderChangedCallback(callback) {
    this.onBookmarkOrderChanged = callback;
  }

  /**
   * Set the open in new tab preference
   * @param {boolean} openInNewTab True to open in new tab, false for current tab
   */
  setOpenInNewTab(openInNewTab) {
    this.openInNewTab = openInNewTab;
  }

  /**
   * Create a bookmark item element
   * @param {Object} bookmark Bookmark data
   * @returns {HTMLElement} Bookmark item element
   */
  createBookmarkItem(bookmark) {
    const item = createElement('div', 'bookmark-item');
    item.setAttribute('data-bookmark-id', bookmark.id);
    item.setAttribute('draggable', 'true');

    // Add URL as data attribute for single-line mode tooltip
    item.setAttribute('data-url', bookmark.url);

    const content = createElement('div', 'bookmark-content');

    // Create favicon element
    const favicon = createElement('img', 'bookmark-icon');
    favicon.setAttribute('data-hostname', getDomain(bookmark.url));

    // Handle custom favicon logic
    this.setCustomFavicon(favicon, bookmark);

    const textContainer = createElement('div', 'bookmark-text-container');

    // Create title element
    const title = createElement('div', 'bookmark-title');
    const { cleanTitle, tags } = parseTitle(bookmark.title);
    title.textContent = cleanTitle || '(Untitled)';
    title.title = cleanTitle || bookmark.url;

    // Create tags container
    const tagsContainer = createElement('div', 'bookmark-tags');
    if (tags.length > 0) {
      tags.forEach(tag => {
        const tagElement = createElement('span', 'bookmark-tag');
        tagElement.textContent = tag.substring(1); // Remove #
        tagElement.style.backgroundColor = getTagColor(tag);
        tagsContainer.appendChild(tagElement);
      });
    }

    // Create domain element
    const domain = createElement('div', 'bookmark-domain');
    domain.textContent = getDomain(bookmark.url);

    // Assemble text container
    textContainer.appendChild(title);
    if (tags.length > 0) {
      textContainer.appendChild(tagsContainer);
    }
    textContainer.appendChild(domain);

    // Assemble content
    content.appendChild(favicon);
    content.appendChild(textContainer);

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

    // Assemble item
    item.appendChild(content);
    item.appendChild(actions);

    // Add click handler to open bookmark
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.bookmark-action')) {
        window.open(bookmark.url, this.openInNewTab ? '_blank' : '_self');
      }
    });

    return item;
  }

  /**
   * Update specific bookmark display
   * @param {Object} bookmark Bookmark data
   */
  updateBookmarkItem(bookmark) {
    const item = document.querySelector(`.bookmark-item[data-bookmark-id="${bookmark.id}"]`);
    if (item) {
      const newItem = this.createBookmarkItem(bookmark);
      item.replaceWith(newItem);
    }
  }

  /**
   * Set custom favicon for bookmark
   * @param {HTMLImageElement} faviconElement Favicon element
   * @param {Object} bookmark Bookmark data
   */
  setCustomFavicon(faviconElement, bookmark) {
    // Extract custom favicon data from bookmark title
    const customFaviconData = this.extractCustomFaviconData(bookmark);

    // Priority: emoji > custom favicon URL > default favicon loading
    if (customFaviconData.emoji) {
      // Convert emoji to data URL
      faviconElement.src = this.emojiToDataUrl(customFaviconData.emoji);
      faviconElement.dataset.loaded = 'true';
      faviconElement.dataset.customFavicon = 'emoji';
    } else if (customFaviconData.faviconUrl) {
      // Use custom favicon URL
      faviconElement.src = customFaviconData.faviconUrl;
      faviconElement.dataset.loaded = 'true';
      faviconElement.dataset.customFavicon = 'url';

      // Add error handler to fall back to default loading
      faviconElement.onerror = () => {
        faviconElement.dataset.loaded = 'false';
        faviconLoader.loadIcon(faviconElement, getDomain(bookmark.url));
      };
    } else {
      // Use default favicon loading
      faviconLoader.loadIcon(faviconElement, getDomain(bookmark.url));
    }
  }

  /**
   * Extract custom favicon data from bookmark title
   * @param {Object} bookmark Bookmark data
   * @returns {Object} Custom favicon data { faviconUrl, emoji }
   */
  extractCustomFaviconData(bookmark) {
    const result = { faviconUrl: '', emoji: '' };

    // Check if title contains favicon metadata
    const faviconUrlMatch = bookmark.title.match(/\[favicon:(https?:\/\/[^\]]+)\]/);
    const emojiMatch = bookmark.title.match(/\[emoji:([^\]]+)\]/);

    if (faviconUrlMatch) {
      result.faviconUrl = faviconUrlMatch[1];
    }

    if (emojiMatch) {
      result.emoji = emojiMatch[1];
    }

    return result;
  }

  /**
   * Convert emoji to data URL for use as favicon
   * @param {string} emoji Emoji character
   * @returns {string} Data URL
   */
  emojiToDataUrl(emoji) {
    // Create canvas to render emoji
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Use higher resolution for crisp emoji display
    const size = 40;
    const scale = 2; // 2x for high DPI displays
    canvas.width = size * scale;
    canvas.height = size * scale;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    // Scale the context for high DPI
    ctx.scale(scale, scale);

    // Set font and draw emoji - use system emoji font
    ctx.font = '28px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size/2, size/2);

    return canvas.toDataURL('image/png');
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
          const count = column.querySelector('.column-count');
          const currentCount = parseInt(count.textContent) - 1;
          count.textContent = currentCount;

          const bookmarkList = column.querySelector('.bookmark-list');
          if (bookmarkList && bookmarkList.children.length === 0) {
            bookmarkList.innerHTML = '<div class="empty-column">No bookmarks</div>';
          }
        }

        // Notify about order change
        if (this.onBookmarkOrderChanged) {
          this.onBookmarkOrderChanged();
        }
      }, 300);
    }
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
}
