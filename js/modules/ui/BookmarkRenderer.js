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
    faviconLoader.loadIcon(favicon, getDomain(bookmark.url));

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

