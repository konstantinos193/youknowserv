import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper function to get file path for a key
const getFilePath = (collection, key) => {
  const collectionDir = path.join(DATA_DIR, collection);
  if (!fs.existsSync(collectionDir)) {
    fs.mkdirSync(collectionDir, { recursive: true });
  }
  return path.join(collectionDir, `${key}.json`);
};

// Read data from a file
export const readData = async (collection, key) => {
  const filePath = getFilePath(collection, key);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
};

// Write data to a file
export const writeData = async (collection, key, value) => {
  const filePath = getFilePath(collection, key);
  try {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
  }
};

// Delete data from a file
export const deleteData = async (collection, key) => {
  const filePath = getFilePath(collection, key);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
    }
  }
};

// Get all data from a collection
export const getAllData = async (collection) => {
  const collectionDir = path.join(DATA_DIR, collection);
  if (!fs.existsSync(collectionDir)) {
    return {};
  }
  
  const files = fs.readdirSync(collectionDir);
  const data = {};
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const key = file.replace('.json', '');
      try {
        const content = JSON.parse(fs.readFileSync(path.join(collectionDir, file), 'utf8'));
        data[key] = content;
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
      }
    }
  }
  
  return data;
};

// Check if data is expired based on timestamp
export const isExpired = (timestamp, duration) => {
  if (!timestamp) return true;
  return Date.now() - new Date(timestamp).getTime() > duration;
};

// Cache data with expiration
export const cacheData = async (collection, key, data, duration) => {
  const cacheEntry = {
    data,
    timestamp: new Date().toISOString(),
    duration
  };
  await writeData(collection, key, cacheEntry);
};

// Get cached data if not expired
export const getCachedData = async (collection, key, duration) => {
  const cacheEntry = await readData(collection, key);
  if (!cacheEntry) return null;
  
  if (isExpired(cacheEntry.timestamp, duration)) {
    await deleteData(collection, key);
    return null;
  }
  
  return cacheEntry.data;
}; 