// js/newtab.js
import { AppCoordinator } from './AppCoordinator.js';
import { themeManager } from './modules/themeManager.js';
import { displayManager } from './modules/displayManager.js';

console.log('Bookmark Kanban newtab.js loaded');

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
  } catch (error) {
    console.error('Initialization failed:', error);
  }
});