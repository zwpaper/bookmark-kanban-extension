/**
 * Debounce function
 * @param {Function} fn Function to execute
 * @param {number} delay Delay time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (fn, delay) => {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
};

/**
 * Create element with class name
 * @param {string} tag HTML tag name
 * @param {string} className CSS class name
 * @returns {HTMLElement} Created element
 */
export const createElement = (tag, className) => {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  return element;
};

/**
 * Format date and time
 * @param {Date} date Date object
 * @returns {Object} Formatted time and date
 */
export const formatDateTime = (date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekday = weekdays[date.getDay()];

  return {
    time: `${hours}:${minutes}:${seconds}`,
    date: `${year}-${month}-${day} ${weekday}`
  };
};

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Safely get domain from URL
 * @param {string} url URL string
 * @returns {string} Domain name
 */
export const getDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
};
