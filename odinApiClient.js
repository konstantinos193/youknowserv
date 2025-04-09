import fetch from 'node-fetch';

const API_BASE_URL = 'https://api.odin.fun/v1';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const RATE_LIMIT_DELAY = 100; // 100ms between requests

// Rate limiting queue
let lastRequestTime = 0;

// Helper to enforce rate limiting
const waitForRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
};

// Helper to get random user agent
const getRandomUserAgent = () => {
  const chromeVersion = Math.floor(Math.random() * 20 + 100);
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
};

// Default headers
const defaultHeaders = {
  'authority': 'api.odin.fun',
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.9',
  'origin': 'https://odin.fun',
  'referer': 'https://odin.fun/',
  'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site'
};

// Main fetch function with retries and rate limiting
const fetchWithRetry = async (endpoint, options = {}, retryCount = 0) => {
  try {
    await waitForRateLimit();
    
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      ...defaultHeaders,
      'User-Agent': getRandomUserAgent(),
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle rate limiting
    if (response.status === 429) {
      if (retryCount < MAX_RETRIES) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10) * 1000;
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        return fetchWithRetry(endpoint, options, retryCount + 1);
      }
      throw new Error('Rate limit exceeded after retries');
    }

    // Handle other errors
    if (!response.ok) {
      if (retryCount < MAX_RETRIES && response.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return fetchWithRetry(endpoint, options, retryCount + 1);
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return fetchWithRetry(endpoint, options, retryCount + 1);
    }
    throw error;
  }
};

// API methods
export const getToken = async (tokenId) => {
  return fetchWithRetry(`/token/${tokenId}`);
};

export const getTokenHolders = async (tokenId, page = 1, limit = 100) => {
  return fetchWithRetry(`/token/${tokenId}/owners?page=${page}&limit=${limit}`);
};

export const getTokenTrades = async (tokenId, page = 1, limit = 9999) => {
  return fetchWithRetry(`/token/${tokenId}/trades?page=${page}&limit=${limit}`);
};

export const getUser = async (userId) => {
  return fetchWithRetry(`/user/${userId}`);
};

export const getUserTokens = async (userId) => {
  return fetchWithRetry(`/user/${userId}/tokens`);
};

export const getUserCreated = async (userId) => {
  return fetchWithRetry(`/user/${userId}/created`);
};

export const getUserActivity = async (userId, page = 1, limit = 100, sort = 'time:desc') => {
  return fetchWithRetry(`/user/${userId}/activity?page=${page}&limit=${limit}&sort=${sort}`);
};

export const getTokens = async (page = 1, limit = 20, sort = 'created_time:desc') => {
  return fetchWithRetry(`/tokens?page=${page}&limit=${limit}&sort=${sort}`);
};

export const getTokenTVFeed = async (tokenId, resolution = 1, last = 350) => {
  return fetchWithRetry(`/token/${tokenId}/tv_feed?resolution=${resolution}&last=${last}`);
}; 