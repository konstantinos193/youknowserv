import { readData, writeData, deleteData, cacheData as storageCache, getCachedData as storageGetCache } from './localStorage.js';

export const cacheData = async (key, data, duration) => {
  try {
    const result = await storageCache('cache', key, data, duration);
    return result.error ? false : true;
  } catch (error) {
    console.error('Cache write error:', error);
    return false;
  }
};

export const getCachedData = async (key, duration) => {
  try {
    const result = await storageGetCache('cache', key, duration);
    return result.data;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
};

export const deleteCachedData = async (key) => {
  try {
    const result = await deleteData('cache', key);
    return result.error ? false : true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
}; 