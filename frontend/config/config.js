export const config = {
  // API Configuration
  API_BASE_URL: __DEV__ 
    ? 'http://10.0.0.49:8000'  // Development - your local IP
    : 'https://your-production-api.com',  // Production URL when deployed
  
  // Request Configuration
  REQUEST_TIMEOUT: 15000,  // 15 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,  // 1 second
  
  // Cache Configuration
  CACHE_EXPIRY: 24 * 60 * 60 * 1000,  // 24 hours in milliseconds
  MAX_CACHE_SIZE: 1000,  // Maximum number of cached items
  
  // Image Processing
  MAX_IMAGE_WIDTH: 800,
  IMAGE_COMPRESSION: 0.3,
  
  // UI Configuration
  PROGRESS_UPDATE_INTERVAL: 100,  // milliseconds
};
