// js/newtab.js
import { App } from './app.js';
import { themeManager } from './modules/themeManager.js';

console.log('Bookmark Kanban newtab.js loaded');

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded');
  
  try {
    // Initialize theme manager
    console.log('Initializing theme manager...');
    await themeManager.initializeTheme();
    console.log('Theme manager initialized, current theme:', themeManager.getCurrentTheme());
    
    // Initialize the application
    new App();
  } catch (error) {
    console.error('Initialization failed:', error);
  }
});