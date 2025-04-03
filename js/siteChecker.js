class SiteChecker {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Check if domain exists through DNS resolution
   * @param {string} hostname Hostname to check
   * @returns {Promise<boolean>} Whether the domain can be resolved
   */
  async checkDomainExists(hostname) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      await fetch(`https://${hostname}`, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      // Check if it's a DNS resolution error
      const errorString = error.toString().toLowerCase();
      if (errorString.includes('name not resolved') || 
          errorString.includes('hostname') ||
          errorString.includes('dns')) {
        return false;
      }
      // Other errors indicate domain might exist
      return true;
    }
  }

  /**
   * Check website availability
   * @param {string} hostname Hostname to check
   * @returns {Promise<boolean>} Whether the website is available
   */
  async checkAvailability(hostname) {
    try {
      const response = await fetch(`https://${hostname}`, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Quick check website through favicon
   * @param {string} hostname Hostname to check
   * @returns {Promise<boolean>} Whether the website is accessible
   */
  async quickCheckFavicon(hostname) {
    return new Promise((resolve) => {
      const img = new Image();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        img.src = '';
        resolve(false);
      }, 2000);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(false);
      };
      
      img.src = `https://${hostname}/favicon.ico?dns-check=${Date.now()}`;
    });
  }

  /**
   * Check website status
   * @param {string} hostname Hostname to check
   * @returns {Promise<boolean|string>} Website status
   */
  async checkSite(hostname) {
    // Skip local network addresses
    if (this.isLocalNetwork(hostname)) {
      return true;
    }
    
    // Check cache
    if (!this.shouldRecheck(hostname)) {
      return this.getCachedStatus(hostname);
    }

    try {
      // First try a quick favicon check
      const quickCheck = await this.quickCheckFavicon(hostname);
      if (quickCheck === true) {
        // Website is normally accessible
        this.updateCache(hostname, true);
        return true;
      }
      
      // If quick check fails, perform DNS check
      const domainExists = await this.checkDomainExists(hostname);
      if (!domainExists) {
        // DNS resolution failed, website is unavailable
        this.updateCache(hostname, false);
        return false;
      }
      
      // DNS exists but might have certificate issues
      this.updateCache(hostname, 'certificate-error');
      return 'certificate-error';
    } catch (error) {
      console.error(`Failed to check website: ${hostname}`, error);
      this.updateCache(hostname, false);
      return false;
    }
  }

  /**
   * Check if recheck is needed
   * @param {string} hostname Hostname to check
   * @returns {boolean} Whether recheck is needed
   */
  shouldRecheck(hostname) {
    const cached = this.cache.get(hostname);
    if (!cached) return true;
    
    const now = Date.now();
    return now - cached.timestamp > this.cacheTimeout;
  }

  /**
   * Get cached status
   * @param {string} hostname Hostname to check
   * @returns {boolean|string} Cached status
   */
  getCachedStatus(hostname) {
    const cached = this.cache.get(hostname);
    return cached ? cached.status : null;
  }

  /**
   * Update cache
   * @param {string} hostname Hostname to update
   * @param {boolean|string} status Status to cache
   */
  updateCache(hostname, status) {
    this.cache.set(hostname, {
      status,
      timestamp: Date.now()
    });
  }

  /**
   * Check if hostname is a local network address
   * @param {string} hostname Hostname to check
   * @returns {boolean} Whether it's a local network address
   */
  isLocalNetwork(hostname) {
    // Check for local network patterns
    const localPatterns = [
      /^localhost$/,
      /^127\.\d+\.\d+\.\d+$/,
      /^192\.168\.\d+\.\d+$/,
      /^10\.\d+\.\d+\.\d+$/,
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/
    ];
    
    return localPatterns.some(pattern => pattern.test(hostname));
  }
}

// Export singleton instance
export const siteChecker = new SiteChecker(); 