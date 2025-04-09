import { readData, writeData, deleteData, cacheData as storageCache, getCachedData as storageGetCache } from './localStorage.js';

export const cacheData = async (key, data, duration) => {
  if (!key || !data) {
    console.warn('Cache write skipped: Missing key or data');
    return false;
  }

  try {
    const result = await storageCache('cache', key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + (duration || 30000) // Default 30s if no duration
    });

    if (result?.error) {
      console.warn(`Cache write warning for key ${key}:`, result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Cache write error:', error);
    return false;
  }
};

export const getCachedData = async (key, duration) => {
  if (!key) {
    console.warn('Cache read skipped: Missing key');
    return null;
  }

  try {
    const result = await storageGetCache('cache', key, duration);
    
    // Handle null/undefined result
    if (!result || !result.data) {
      return null;
    }

    // Check if cache is expired
    if (result.data.expiry && Date.now() > result.data.expiry) {
      await deleteCachedData(key);
      return null;
    }

    return result;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
};

export const deleteCachedData = async (key) => {
  if (!key) {
    console.warn('Cache delete skipped: Missing key');
    return false;
  }

  try {
    const result = await deleteData('cache', key);
    
    if (result?.error) {
      console.warn(`Cache delete warning for key ${key}:`, result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
}; 
