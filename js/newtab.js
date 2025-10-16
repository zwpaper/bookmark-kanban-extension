// js/newtab.js
import { AppCoordinator } from './AppCoordinator.js';
import { themeManager } from './modules/themeManager.js';
import { displayManager } from './modules/displayManager.js';

console.log('KanbanMark newtab.js loaded');

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded');

  try {
    // Initialize theme manager
    console.log('Initializing theme manager...');
    await themeManager.initializeTheme();
    console.log('Theme manager initialized, current theme:', themeManager.getCurrentTheme());

    // Initialize display mode manager
    console.log('Initializing display mode manager...');
    await displayManager.initializeDisplayMode();
    console.log('Display mode manager initialized, current mode:', displayManager.getCurrentDisplayMode());

    // Initialize the application
    const app = new AppCoordinator();
    await app.initialize();

    // Load open in new tab settings
    chrome.storage.sync.get(['openInNewTab'], result => {
      app.setOpenInNewTab(result.openInNewTab !== false);
    });
  } catch (error) {
    console.error('Initialization failed:', error);
  }
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'THEME_CHANGED') {
    themeManager.applyTheme(request.theme);
  } else if (request.type === 'DISPLAY_MODE_CHANGED') {
    displayManager.applyDisplayMode(request.mode);
  } else if (request.type === 'OPEN_IN_NEW_TAB_CHANGED') {
    if (window.app) {
      window.app.setOpenInNewTab(request.openInNewTab);
    }
  }
});
