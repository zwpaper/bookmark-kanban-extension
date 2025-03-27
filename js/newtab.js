// js/newtab.js
import { App } from './app.js';

console.log('Bookmark Kanban newtab.js loaded');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  
  // Initialize the application
  new App();
});