const express = require('express'); // or import express from 'express';
const cors = require('cors');
const dotenv = require('dotenv');
const { fileURLToPath } = require('url');
const { dirname } = require('path');
const fetch = require('node-fetch');
const { readData, writeData, deleteData } = require('./localStorage.js');
const { cacheData, getCachedData, deleteCachedData } = require('./cache.js');
const fs = require('fs/promises');
const path = require('path');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Initialize environment variables
dotenv.config();

// Cache and batch processing constants
const CACHE_DURATION = 30000; // 30 seconds
const INITIAL_TOKEN_LIMIT = 100; // Only process 100 tokens initially
const BATCH_SIZE = 5;
const BATCH_DELAY = 500; // 500ms between batches

// List of trusted developer IDs
const TRUSTED_DEVELOPERS = [
  'vv5jb-7sm7u-vn3nq-6nflf-dghis-fd7ji-cx764-xunni-zosog-eqvpw-oae'  // bob
];

const app = express();
const port = process.env.PORT || 3001;
// ... other requires and code ...

// Add rate limiting configuration
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Memory management
const MEMORY_CACHE_SIZE = 100; // Maximum number of items in memory cache
const MEMORY_CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Clean up memory cache periodically
setInterval(() => {
  if (memoryCache.size > MEMORY_CACHE_SIZE) {
    const entriesToDelete = Array.from(memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, Math.floor(MEMORY_CACHE_SIZE * 0.2)); // Remove oldest 20%
    
    entriesToDelete.forEach(([key]) => memoryCache.delete(key));
    console.log(`Cleaned up ${entriesToDelete.length} items from memory cache`);
  }
}, MEMORY_CACHE_CLEANUP_INTERVAL);

// Apply rate limiting to all routes
app.use(limiter);

// Update CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log('Incoming request origin:', origin);

  // Allow any localhost port during development and specific domains
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://tools.humanz.fun',
    'https://odinscan.fun',
    'https://157.180.36.186:3001'
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, Accept, Accept-Language, Origin, Referer');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

// Add compression middleware
app.use(compression());

// Parse JSON bodies
app.use(express.json());

// Middleware for logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request headers:', {
    origin: req.headers.origin,
    referer: req.headers.referer,
    host: req.headers.host
  });
  next();
});

// Add memory cache for frequently accessed tokens
const memoryCache = new Map();
const MEMORY_CACHE_DURATION = 60000; // 1 minute

// Add this near the top of your file, after the other constants
const DEBUG = process.env.DEBUG === 'true';

// Add this helper function
const log = (message, data = null) => {
  if (DEBUG) {
    console.log(`[${new Date().toISOString()}] ${message}`);
    if (data) {
      console.log(data);
    }
  }
};

// Helper function to get random user agent
const getRandomUserAgent = () => {
  const chromeVersion = Math.floor(Math.random() * 20 + 100);
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
};

// Example fetch request with headers
// ... existing code ...

// Update the fetchWithHeaders function
// Update the fetchWithHeaders function
// ... existing code ...

// ... existing code ...

const fetchWithHeaders = async (url, retryCount = 0, maxRetries = 5) => {
  try {
    console.log(`Fetching URL: ${url}, Attempt: ${retryCount + 1}`);
    const headers = {
      ...API_HEADERS,
      'User-Agent': getRandomUserAgent(),
      'Accept': 'application/json',
      'Origin': 'https://odinscan.fun'
    };

    const response = await fetch(url, { 
      headers,
      mode: 'cors',
      credentials: 'include'
    });

    // Log the response status and headers for debugging
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Headers:`, Object.fromEntries(response.headers));

    if (response.status === 403) {
      console.warn(`403 Forbidden for URL: ${url}. Retrying with delay...`);
      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithHeaders(url, retryCount + 1, maxRetries);
      } else {
        throw new Error('Max retries reached for 403 error');
      }
    }

    if (!response.ok) {
      const text = await response.text();
      console.error(`API response not ok: ${response.status}, Response: ${text}`);
      throw new Error(`API response not ok: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    if (retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithHeaders(url, retryCount + 1, maxRetries);
    }
    return null;
  }
};

// ... existing code ...

// ... existing code ...
// ... existing code ...

// Token data endpoint
app.get('/api/token/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    console.log(`Fetching token data for ${tokenId}`);
    
    // Define cache keys at the start
    const memoryCacheKey = `token_${tokenId}`;
    const cacheKey = `token_${tokenId}`;

    // Check memory cache first
    const memoryCached = memoryCache.get(memoryCacheKey);
    if (memoryCached && Date.now() - memoryCached.timestamp < CACHE_DURATION) {
      console.log('Returning from memory cache');
      return res.json(memoryCached.data);
    }

    console.log('Fetching fresh data from API');
    // Fetch token data and BTC price in parallel
    const [tokenResponse, btcPriceResponse] = await Promise.all([
      fetch(`https://api.odin.fun/v1/token/${tokenId}`, {
        headers: {
          ...API_HEADERS,
          'User-Agent': getRandomUserAgent()
        }
      }),
      fetch('https://mempool.space/api/v1/prices')
    ]);

    console.log('API Response Status:', {
      token: tokenResponse.status,
      btcPrice: btcPriceResponse.status
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token not found: ${tokenResponse.status}`);
    }

    const [tokenData, btcPriceData] = await Promise.all([
      tokenResponse.json(),
      btcPriceResponse.ok ? btcPriceResponse.json() : { USD: 30000 }
    ]);

    console.log('Token API Response:', tokenData);

    if (!tokenData || typeof tokenData !== 'object') {
      throw new Error(`Invalid token data received: ${JSON.stringify(tokenData)}`);
    }

    // Calculate volume in BTC and USD
    const volume24hBTC = Number(tokenData.volume) / 1e8; // Convert satoshis to BTC
    const volumeUSD = volume24hBTC * btcPriceData.USD;

    // Process holders data
    const holders = (tokenData.holders || [])
      .map(holder => ({
        user: holder.user,
        user_username: holder.user_username || holder.user.substring(0, 8),
        balance: holder.balance,
        percentage: ((Number(holder.balance) / Number(tokenData.total_supply)) * 100).toFixed(2)
      }))
      .sort((a, b) => Number(b.balance) - Number(a.balance));

    // Calculate 24h trades count
    const now = new Date();
    const last24h = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const trades24h = (tokenData.trades || []).filter(tx => new Date(tx.time) > last24h).length;

    const enrichedData = {
      ...tokenData,
      holders,
      holder_count: tokenData.holder_count || holders.length,
      volume24hBTC,
      volumeUSD,
      trades24h,
      btcPrice: btcPriceData.USD
    };

    // Update both caches
    memoryCache.set(memoryCacheKey, {
      data: enrichedData,
      timestamp: Date.now()
    });
    await cacheData(cacheKey, enrichedData);

    console.log('Successfully processed token data:', {
      price: enrichedData.price,
      volume24hBTC,
      volumeUSD,
      holder_count: enrichedData.holder_count,
      trades24h
    });

    res.json(enrichedData);

  } catch (error) {
    console.error('Token fetch error:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      error: 'Failed to fetch token data',
      message: error.message,
      details: error.stack
    });
  }
});

// Update the token owners endpoint
app.get('/api/token/:tokenId/owners', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { page = 1, limit = 100 } = req.query;

    console.log(`Fetching holders for token ${tokenId}, page ${page}, limit ${limit}`);

    // Check cache first
    const cacheKey = `holders_${tokenId}_${page}_${limit}`;
    const cachedData = await getCachedData(cacheKey, CACHE_DURATION);

    if (cachedData) {
      console.log('Returning cached holders data');
      return res.json(cachedData);
    }

    // Fetch from Odin API with pagination
    const response = await fetch(
      `https://api.odin.fun/v1/token/${tokenId}/owners?page=${page}&limit=${limit}`,
      {
        headers: {
          ...API_HEADERS,
          'User-Agent': getRandomUserAgent(),
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch holders: ${response.status}`);
    }

    const data = await response.json();
    
    // Process holders data to include percentages
    if (data.data && Array.isArray(data.data)) {
      // Get total supply from token info for percentage calculation
      const tokenResponse = await fetch(
        `https://api.odin.fun/v1/token/${tokenId}`,
        {
          headers: {
            ...API_HEADERS,
            'User-Agent': getRandomUserAgent(),
          }
        }
      );
      
      const tokenData = await tokenResponse.json();
      const totalSupply = tokenData.total_supply || "0";

      // Calculate percentages and format balances
      data.data = data.data.map(holder => ({
        user: holder.user,
        user_username: holder.user_username || holder.user.substring(0, 8),
        balance: holder.balance.toString(),
        percentage: ((Number(holder.balance) / Number(totalSupply)) * 100).toFixed(2) + "%"
      }));
    }

    // Cache the processed data
    await cacheData(cacheKey, data, CACHE_DURATION);

    console.log(`Returning ${data.data?.length || 0} holders`);
    res.json(data);

  } catch (error) {
    console.error('Token owners fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch token holders',
      message: error.message,
      data: [],
      page: 1,
      limit: 100,
      count: 0
    });
  }
});

// Trading history endpoint
app.get('/api/token/:tokenId/trades', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { page = 1, limit = 100 } = req.query; // Default to 100 trades per page

    // Check cache first
    const cacheKey = `trades_${tokenId}_${page}_${limit}`;
    const { data: cachedTrades } = await getCachedData(cacheKey, CACHE_DURATION) || {};

    if (cachedTrades) {
      return res.json(cachedTrades);
    }

    // Fetch from Odin API with pagination
    const response = await fetch(`https://api.odin.fun/v1/token/${tokenId}/trades?page=${page}&limit=${limit}`, {
      headers: {
        ...API_HEADERS,
        'User-Agent': getRandomUserAgent(),
      },
    });

    if (!response.ok) {
      throw new Error(`API response not ok: ${response.status}`);
    }

    const data = await response.json();

    // Cache the response
    await cacheData(cacheKey, data, CACHE_DURATION);

    res.json(data);
  } catch (error) {
    console.error('Trades fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch trading data',
      message: error.message,
      data: { data: [] } // Return empty array as fallback
    });
  }
});

// Creator info endpoint
app.get('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Check cache first
    const { data: cachedUser } = await getCachedData('users', userId, CACHE_DURATION);

    if (cachedUser) {
      return res.json(cachedUser);
    }

    // Fetch from Odin API using the new client
    const data = await odinApi.getUser(userId);

    // Cache the response
    await cacheData('users', userId, data, CACHE_DURATION);

    res.json(data);
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Update the price endpoint with proper error handling
app.get('/api/price', async (req, res) => {
  try {
    const { tokenId } = req.query;
    console.log(`Fetching price for token: ${tokenId}`);

    if (!tokenId) {
      return res.status(400).json({ 
        error: 'Missing parameter',
        message: 'tokenId is required'
      });
    }

    // Check cache first
    const { data: cachedPrice } = await getCachedData(`prices_${tokenId}`, CACHE_DURATION) || {};

    if (cachedPrice) {
      return res.json(cachedPrice.data);
    }

    // Fetch from token endpoint
    const response = await fetch(`https://api.odin.fun/v1/token/${tokenId}`, {
      headers: {
        ...API_HEADERS,
        'User-Agent': getRandomUserAgent(),
      },
    });

    if (!response.ok) {
      throw new Error(`API response not ok: ${response.status}`);
    }

    const data = await response.json();

    if (!data) {
      return res.status(404).json({
        error: 'Token not found',
        message: `No data found for token ID: ${tokenId}`
      });
    }

    // Calculate price
    const totalSupply = Number(data.total_supply || 0) / 1e18;
    const marketcap = Number(data.marketcap || 0); // In satoshis
    const btcPrice = totalSupply > 0 ? marketcap / 1e8 / totalSupply : 0; // First convert marketcap to BTC, then divide by supply
    
    const priceData = {
      btcPrice: btcPrice,
      tokenPrice: btcPrice,
      usdPrice: btcPrice.toFixed(8)
    };

    // Cache the data
    await cacheData(`prices_${tokenId}`, priceData, CACHE_DURATION);

    console.log('Sending price data:', priceData);
    return res.json(priceData);

  } catch (error) {
    console.error('Price fetch error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch price data',
      message: error.message,
      btcPrice: 0,
      tokenPrice: 0,
      usdPrice: "0.00000000"
    });
  }
});

// Add this near the top of the file
const USER_CREATED_CACHE_DURATION = 120000; // 2 minutes

// Update the user created tokens endpoint
// ... existing code ...

app.get('/api/user/:userId/created', async (req, res) => {
  try {
    const { userId } = req.params;
    const cacheKey = `user_created_${userId}`;

    // Check Supabase cache first
    const { data: cachedData } = await getCachedData(cacheKey, USER_CREATED_CACHE_DURATION);

    if (cachedData) {
      return res.json(cachedData.data);
    }

    // Fetch from Odin API if not in cache
    const data = await fetchOdinAPI(`/user/${userId}/created`, {
      sort: 'last_action_time:desc',
      page: '1',
      limit: '999999'
    });

    // Save to Supabase cache
    await cacheData(cacheKey, data, USER_CREATED_CACHE_DURATION);

    res.json(data);
  } catch (error) {
    console.error('Created tokens fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch created tokens' });
  }
});

// ... existing code ...

// Add CORS preflight handling
app.options('/api/user/:userId/created', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.status(204).end();
});

// Add this new endpoint for user's token holdings
app.get('/api/user/:userId/tokens', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check Supabase cache first
    const { data: cachedHoldings, error: cacheError } = await getCachedData(`user_holdings_${userId}`, CACHE_DURATION);

    if (cachedHoldings) {
      return res.json(cachedHoldings.data);
    }

    // Fetch from Odin API if not in cache
    const response = await fetch(
      `https://api.odin.fun/v1/user/${userId}/tokens`,
      {
        headers: {
          ...API_HEADERS,
          'User-Agent': getRandomUserAgent(),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API response not ok: ${response.status}`);
    }

    const data = await response.json();

    // Save to Supabase
    const { error: upsertError } = await writeData(`user_holdings_${userId}`, data, CACHE_DURATION);

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
    }

    res.json(data);
  } catch (error) {
    console.error('Token holdings fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch token holdings',
      data: { data: [] } // Return empty array as fallback
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Update the combined data endpoint with proper CORS handling
app.get('/api/token-data/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    console.log(`Processing token data for: ${tokenId}`);
    
    // Check cache first with proper null handling
    const cachedResult = await getCachedData(`combined_data_${tokenId}`, 5000);
    if (cachedResult?.data) {
      console.log('Returning cached data');
      return res.json(cachedResult.data);
    }

    // Get previous holder count with null safety
    const previousResult = await getCachedData(`combined_data_${tokenId}`, 5000);
    const previousHolderCount = previousResult?.data?.token?.holder_count || 0;

    console.log('Fetching data from API...');
    
    // Fetch all data in parallel with proper error handling
    const [tokenResponse, holdersResponse, tradesResponse, btcPriceResponse] = await Promise.allSettled([
      fetch(`https://api.odin.fun/v1/token/${tokenId}`, {
        headers: {
          ...API_HEADERS,
          'User-Agent': getRandomUserAgent()
        }
      }),
      fetch(`https://api.odin.fun/v1/token/${tokenId}/owners?page=1&limit=100`, {
        headers: {
          ...API_HEADERS,
          'User-Agent': getRandomUserAgent()
        }
      }),
      fetch(`https://api.odin.fun/v1/token/${tokenId}/trades?page=1&limit=9999`, {
        headers: {
          ...API_HEADERS,
          'User-Agent': getRandomUserAgent()
        }
      }),
      fetch('https://mempool.space/api/v1/prices')
    ]);

    // Process responses with proper error handling
    const tokenData = tokenResponse.status === 'fulfilled' && tokenResponse.value.ok ? 
      await tokenResponse.value.json() : {};
      
    const holdersData = holdersResponse.status === 'fulfilled' && holdersResponse.value.ok ? 
      await holdersResponse.value.json() : { data: [] };
      
    const tradesData = tradesResponse.status === 'fulfilled' && tradesResponse.value.ok ? 
      await tradesResponse.value.json() : { data: [] };
      
    const btcPriceData = btcPriceResponse.status === 'fulfilled' && btcPriceResponse.value.ok ? 
      await btcPriceResponse.value.json() : { USD: 0 };

    console.log('API responses received:', {
      hasTokenData: Object.keys(tokenData).length > 0,
      holdersCount: holdersData.data?.length || 0,
      tradesCount: tradesData.data?.length || 0,
      btcPrice: btcPriceData.USD
    });

    // Add fallback values for tokenData
    const safeTokenData = {
      holder_count: holdersData.data?.length || 0,
      total_supply: tokenData.total_supply || '0',
      marketcap: tokenData.marketcap || '0',
      ...tokenData
    };

    // Calculate holder growth rate with null safety
    const currentHolderCount = safeTokenData.holder_count;
    const holderGrowthRate = previousHolderCount > 0 
      ? ((currentHolderCount - previousHolderCount) / previousHolderCount) * 100 
      : 0;

    // Safe BigInt conversions
    const totalSupply = BigInt(safeTokenData.total_supply || '0');
    const marketcap = BigInt(safeTokenData.marketcap || '0');

    // Convert to numbers safely
    const totalSupplyNumber = Number(totalSupply) / 1e11;
    const marketcapBTC = Number(marketcap) / 1e8;
    
    // Fix price calculation with safe defaults
    const satoshiPrice = safeTokenData.price || 0;
    const btcPrice = satoshiPrice / 1e9;
    const usdPrice = (btcPrice * btcPriceData.USD) / 100;

    // Calculate volume metrics safely
    const trades = tradesData.data || [];
    const volumeMetrics = calculateVolumeMetrics(trades, btcPriceData.USD);

    // Check dev holdings safely
    const devHolder = holdersData.data?.find(h => h.user === safeTokenData.creator);
    const devHoldings = devHolder ? Number(devHolder.balance) : 0;
    const devPercentage = (devHoldings / Number(safeTokenData.total_supply || 1)) * 100;

    const dangers = [];
    if (devHoldings === 0) {
      dangers.push('Developer has sold their entire position');
    }

    // Calculate PnL safely
    const holderPnL = await calculateHolderPnL(holdersData.data || [], trades, {
      btcPrice,
      tokenPrice: btcPrice,
      usdPrice: usdPrice.toFixed(8)
    }, tokenId);

    const top10PnL = Array.isArray(holderPnL) ? holderPnL.slice(0, 10) : [];

    const combinedData = {
      token: safeTokenData,
      holders: holdersData,
      trades: tradesData,
      btcUsdPrice: btcPriceData.USD,
      holderGrowth: holderGrowthRate,
      price: {
        btcPrice,
        tokenPrice: btcPrice,
        usdPrice: usdPrice.toFixed(8)
      },
      volumeMetrics,
      dangers,
      holderPnL: {
        top10: top10PnL,
        totalPnL: top10PnL.reduce((sum, h) => sum + (h.pnl || 0), 0)
      }
    };

    // Cache the result
    await cacheData(`combined_data_${tokenId}`, combinedData, CACHE_DURATION);

    console.log('Successfully processed token data');
    res.json(combinedData);
  } catch (error) {
    console.error('Combined data error:', error);
    // Return a safe fallback response
    res.status(500).json({
      error: 'Failed to fetch combined data',
      details: error.message,
      token: {},
      holders: { data: [] },
      trades: { data: [] },
      btcUsdPrice: 0,
      holderGrowth: 0,
      price: {
        btcPrice: 0,
        tokenPrice: 0,
        usdPrice: "0.00000000"
      },
      volumeMetrics: {
        volume24h: 0,
        averageDailyVolume: 0,
        tradeCount24h: 0,
        buyVolume24h: 0,
        sellVolume24h: 0,
        buySellRatio: 0,
        spikeRatio: 0,
        volumeChange: "0.00"
      },
      dangers: [],
      holderPnL: {
        top10: [],
        totalPnL: 0
      }
    });
  }
});

// Add this new endpoint for token analysis
app.get('/api/token-analysis/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    console.log(`Analyzing token data for: ${tokenId}`);

    // Get combined data first
    const combinedResponse = await fetch(`${API_URL}/api/token-data/${tokenId}`);
    if (!combinedResponse.ok) {
      throw new Error('Failed to fetch combined data');
    }
    const combinedData = await combinedResponse.json();

    // Log the combined data for debugging
    console.log('Combined data fetched:', combinedData);

    // Extract necessary data
    const {
      token: tokenData,
      holders: { data: holders },
      trades: { data: trades },
      creator,
      btcUsdPrice,
      holderGrowth
    } = combinedData;

    // Log extracted data
    console.log('Extracted data:', { tokenData, holders, trades });

    // Calculate risk analysis
    const dangers = [];
    
    // Volume Analysis
    const volumeMetrics = calculateVolumeMetrics(trades, btcUsdPrice);
    console.log('Volume metrics calculated:', volumeMetrics);
    
    if (volumeMetrics.spikeRatio > 3) {
      dangers.push({
        warning: "Unusual Volume Activity",
        message: `24h volume is ${volumeMetrics.spikeRatio.toFixed(1)}x higher than 7-day average`
      });
    }

    // Developer Analysis
    if (!TRUSTED_DEVELOPERS.includes(tokenData.creator)) {
      // Check creator's other tokens
      if (creator?.created?.length > 1) {
        const uniqueTickers = [...new Set(creator.created.map(t => t.ticker))];
        const displayTickers = uniqueTickers.slice(0, 5);
        const remainingCount = uniqueTickers.length - 5;
        const tickerDisplay = remainingCount > 0 
          ? `${displayTickers.join(', ')} and ${remainingCount} more`
          : displayTickers.join(', ');
        
        dangers.push({
          warning: "Multiple tokens by creator",
          message: `Developer has created ${uniqueTickers.length} tokens (${tickerDisplay})`
        });
      }

      // Check dev holdings
      const devHolder = holders.find(h => h.user === tokenData.creator);
      const devHoldings = devHolder ? Number(devHolder.balance) : 0;
      const devPercentage = devHoldings > 0 
        ? (devHoldings / Number(tokenData.total_supply)) * 100 
        : 0;

      // Only add the developer sold position warning once
      if (devHoldings === 0) {
        dangers.push({
          warning: "Developer has sold all tokens",
          message: "Developer holds 0% of the supply"
        });
      }

      // Distribution Analysis
      const totalSupplyNum = Number(tokenData.total_supply);
      const top5Holdings = holders
        .slice(0, 5)
        .reduce((sum, h) => sum + Number(h.balance), 0);
      const top5Percentage = (top5Holdings / totalSupplyNum) * 100;

      const top10Holdings = holders
        .slice(0, 10)
        .reduce((sum, h) => sum + Number(h.balance), 0);
      const top10Percentage = (top10Holdings / totalSupplyNum) * 100;

      // Determine risk level
      let riskLevel;
      if (devHoldings === 0) {
        riskLevel = {
          level: "EXTREME RISK",
          message: "Developer has sold their entire position - Extreme risk of abandonment",
          color: "text-red-600"
        };
      } else if (devPercentage >= 50 || top5Percentage >= 70) {
        riskLevel = {
          level: "EXTREME RISK",
          message: "Extremely high centralization. High probability of price manipulation.",
          color: "text-red-600"
        };
      } else if (devPercentage >= 30 || top5Percentage >= 50) {
        riskLevel = {
          level: "VERY HIGH RISK",
          message: "Very high centralization detected. Major price manipulation risk.",
          color: "text-red-500"
        };
      } else if (devPercentage >= 20 || top5Percentage >= 40) {
        riskLevel = {
          level: "HIGH RISK",
          message: "High holder concentration. Exercise extreme caution.",
          color: "text-orange-500"
        };
      } else {
        riskLevel = {
          level: "MODERATE RISK",
          message: "Standard market risks apply. Trade carefully.",
          color: "text-yellow-500"
        };
      }

      const analysis = {
        ...riskLevel,
        dangers,
        volumeMetrics,
        distribution: {
          devPercentage,
          top5Percentage,
          top10Percentage,
          holderGrowth
        }
      };

      // Cache and send response
      await writeData(`token_analysis_${tokenId}`, analysis, CACHE_DURATION);

      res.json(analysis);
    } else {
      // If creator is trusted, set a default risk level
      const analysis = {
        level: "LOW RISK",
        message: "Developer is trusted. Low risk of manipulation.",
        color: "text-green-500",
        dangers: [],
        volumeMetrics,
        distribution: {
          devPercentage: 0,
          top5Percentage: 0,
          top10Percentage: 0,
          holderGrowth
        }
      };

      res.json(analysis);
    }
  } catch (error) {
    console.error('Token analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze token',
      details: error.message
    });
  }
});

// Add this helper function
const calculateVolumeMetrics = (trades, btcUsdPrice) => {
  const now = new Date();
  const last24h = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  const last7d = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

  const trades24h = trades.filter(tx => new Date(tx.time) > last24h);
  
  // Calculate total 24h volume in BTC (amount_btc is in satoshis)
  const volume24h = trades24h.reduce((sum, tx) => sum + (Number(tx.amount_btc) / 1e8), 0);

  // Calculate buy and sell volumes in BTC
  const buyVolume24h = trades24h
    .filter(tx => tx.action === "BUY")
    .reduce((sum, tx) => sum + (Number(tx.amount_btc) / 1e8), 0);
  
  const sellVolume24h = trades24h
    .filter(tx => tx.action === "SELL")
    .reduce((sum, tx) => sum + (Number(tx.amount_btc) / 1e8), 0);

  // Calculate buy/sell ratio (avoid division by zero)
  const buySellRatio = sellVolume24h > 0 ? buyVolume24h / sellVolume24h : 1;

  // Calculate 7d metrics
  const trades7d = trades.filter(tx => {
    const txTime = new Date(tx.time);
    return txTime > last7d && txTime <= last24h;
  });
  const volume7d = trades7d.reduce((sum, tx) => sum + (Number(tx.amount_btc) / 1e8), 0);
  const averageDailyVolume = volume7d / 6;

  // Calculate volume change percentage
  const volumeChange = averageDailyVolume > 0 
    ? ((volume24h - averageDailyVolume) / averageDailyVolume * 100).toFixed(2)
    : '0.00';

  // Calculate USD values
  const volume24hUSD = volume24h * btcUsdPrice;
  const averageDailyVolumeUSD = averageDailyVolume * btcUsdPrice;
  const buyVolumeUSD = buyVolume24h * btcUsdPrice;
  const sellVolumeUSD = sellVolume24h * btcUsdPrice;

  return {
    volume24h,
    volume24hUSD,
    averageDailyVolume,
    averageDailyVolumeUSD,
    tradeCount24h: trades24h.length,
    buyVolume24h,
    buyVolumeUSD,
    sellVolume24h,
    sellVolumeUSD,
    buySellRatio,
    spikeRatio: averageDailyVolume > 0 ? volume24h / averageDailyVolume : 1,
    volumeChange
  };
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 

// ... existing code ...

// Add this helper function to handle Odin API requests
const fetchOdinAPI = async (endpoint) => {
  const response = await fetch(`https://api.odin.fun/v1${endpoint}`, {
    headers: API_HEADERS
  });
  
  if (!response.ok) {
    throw new Error(`Odin API error: ${response.status}`);
  }
  
  return response.json();
};

// Add this new endpoint for tokens
app.get('/api/tokens', async (req, res) => {
  try {
    // Check cache first
    const cachedResult = await getCachedData('all_tokens_cache', TOKEN_CACHE_DURATION);
    if (cachedResult) {
      console.log('Returning cached tokens');
      return res.json(cachedResult);
    }

    console.log('No valid cache found, fetching from API');
    // Single API call to get tokens with all needed data
    const { sort = 'created_time:desc', page = '1', limit = '20' } = req.query;
    const data = await fetchOdinAPI('/tokens', { sort, page, limit });

    // Cache the new data
    await cacheData('all_tokens_cache', data, TOKEN_CACHE_DURATION);

    res.json(data);
  } catch (error) {
    console.error('Tokens fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

// ... existing code ...

// Add this near the top of the file
const CACHE_DURATIONS = {
  TOKENS: 30000, // 30 seconds
  TOKEN_DATA: 60000, // 1 minute
  HOLDERS: 30000, // 30 seconds
  TRADES: 60000, // 1 minute
  USER_DATA: 120000 // 2 minutes
};

// Add this helper function to check for new tokens
// const checkForNewTokens = async () => {
//   try {
//     // Get the latest token from the API
//     const response = await fetchOdinAPI('/tokens', {
//       sort: 'created_time:desc',
//       page: '1',
//       limit: '1'
//     });

//     if (!response || !response.data || response.data.length === 0) return;

//     const latestToken = response.data[0];
    
//     // Check if this token exists in our cache
//     const { data: cachedToken } = await supabase
//       .from('tokens')
//       .select('*')
//       .eq('id', latestToken.id)
//       .single();

//     // If it's a new token, update the cache
//     if (!cachedToken) {
//       await supabase
//         .from('tokens')
//         .upsert({
//           id: latestToken.id,
//           data: latestToken,
//           updated_at: new Date().toISOString()
//         });
      
//       console.log(`New token detected: ${latestToken.name} (${latestToken.id})`);
//     }
//   } catch (error) {
//     console.error('Error checking for new tokens:', error);
//   }
// };

// Interval moved to bottom of file
// setInterval(checkForNewTokens, NEW_TOKEN_POLL_INTERVAL);

// Update the /tokens endpoint to include a "new" flag
app.get('/tokens', async (req, res) => {
  try {
    const { sort = 'created_time:desc', page = '1', limit = '20' } = req.query;
    const cacheKey = `tokens_${sort}_${page}_${limit}`;

    // Check Supabase cache first
    const { data: cachedTokens } = await getCachedData(cacheKey, CACHE_DURATIONS.TOKENS);

    if (cachedTokens) {
      return res.json(cachedTokens.data);
    }

    // Fetch from Odin API if not in cache
    const data = await fetchOdinAPI('/tokens', { sort, page, limit });

    // Mark new tokens (created within the last 5 minutes)
    const now = Date.now();
    const newThreshold = 5 * 60 * 1000; // 5 minutes
    data.data = data.data.map(token => ({
      ...token,
      isNew: (now - new Date(token.created_time).getTime()) < newThreshold
    }));

    // Save to Supabase cache
    await cacheData(cacheKey, data, CACHE_DURATIONS.TOKENS);

    res.json(data);
  } catch (error) {
    console.error('Tokens fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

// Add this helper function for batched requests
const batchRequests = async (requests) => {
  const results = await Promise.allSettled(requests);
  return results.map(result => 
    result.status === 'fulfilled' ? result.value : null
  );
};

// Update the batch tokens endpoint to use the existing tokens table
app.get('/api/batch-tokens', async (req, res) => {
  try {
    const { tokenIds } = req.query;
    
    if (!tokenIds) {
      return res.status(400).json({ error: 'tokenIds query parameter is required' });
    }

    let parsedTokenIds;
    try {
      parsedTokenIds = JSON.parse(tokenIds);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid tokenIds format' });
    }

    if (!Array.isArray(parsedTokenIds)) {
      return res.status(400).json({ error: 'tokenIds must be an array' });
    }

    // Fetch tokens and their trades in parallel
    const tokenPromises = parsedTokenIds.map(async (tokenId) => {
      try {
        // Check cache first
        const { data: cachedToken } = await getCachedData(`tokens_${tokenId}`, CACHE_DURATIONS.TOKENS);

        let tokenData;
        let tradesData;

        if (cachedToken) {
          tokenData = cachedToken;
          // Still need to fetch trades for volume metrics
          const tradesResponse = await fetchOdinAPI(`/token/${tokenId}/trades?page=1&limit=9999`);
          tradesData = tradesResponse;
        } else {
          // Fetch both token and trades data if not cached
          [tokenData, tradesData] = await Promise.all([
            fetchOdinAPI(`/token/${tokenId}`),
            fetchOdinAPI(`/token/${tokenId}/trades?page=1&limit=9999`)
          ]);
        }

        // Calculate volume metrics
        const now = new Date();
        const last24h = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const last7d = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

        const trades = tradesData.data || [];
        const trades24h = trades.filter(tx => new Date(tx.time) > last24h);
        const buyTrades = trades24h.filter(tx => tx.buy);
        const sellTrades = trades24h.filter(tx => !tx.buy);

        // Calculate BTC volumes
        const volume24h = trades24h.reduce((sum, tx) => sum + (Number(tx.amount_btc) / 1e8), 0);
        const buyVolume24h = buyTrades.reduce((sum, tx) => sum + (Number(tx.amount_btc) / 1e8), 0);
        const sellVolume24h = sellTrades.reduce((sum, tx) => sum + (Number(tx.amount_btc) / 1e8), 0);

        // Calculate 7d average
        const trades7d = trades.filter(tx => {
          const txTime = new Date(tx.time);
          return txTime > last7d && txTime <= last24h;
        });
        const volume7d = trades7d.reduce((sum, tx) => sum + (Number(tx.amount_btc) / 1e8), 0);
        const averageDailyVolume = volume7d / 6;

        // Get BTC/USD price
        const btcPriceResponse = await fetch('https://mempool.space/api/v1/prices');
        const btcPriceData = await btcPriceResponse.json();
        const btcUsdPrice = btcPriceData.USD;

        // Add volume metrics to token data
        const enrichedTokenData = {
          ...tokenData,
          volumeMetrics: {
            volume24h,
            volume24hUSD: volume24h * btcUsdPrice,
            tradeCount24h: trades24h.length,
            buySellRatio: sellVolume24h > 0 ? buyVolume24h / sellVolume24h : 1,
            buyVolume24h,
            sellVolume24h,
            buyVolumeUSD: buyVolume24h * btcUsdPrice,
            sellVolumeUSD: sellVolume24h * btcUsdPrice,
            averageDailyVolume,
            averageDailyVolumeUSD: averageDailyVolume * btcUsdPrice
          }
        };

        // Cache the enriched token data
        await cacheData(`tokens_${tokenId}`, enrichedTokenData, CACHE_DURATIONS.TOKENS);

        return enrichedTokenData;
      } catch (error) {
        console.error(`Error fetching token ${tokenId}:`, error);
        return null;
      }
    });

    const tokens = await Promise.all(tokenPromises);
    res.json(tokens.filter(Boolean));
  } catch (error) {
    console.error('Batch tokens error:', error);
    res.status(500).json({ error: 'Failed to fetch batch tokens' });
  }
});

// Add this endpoint for batch user-created tokens
app.get('/api/batch-user-created', async (req, res) => {
  try {
    let { userIds } = req.query;

    // Parse userIds if it's a JSON string
    if (typeof userIds === 'string') {
      try {
        userIds = JSON.parse(userIds);
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid user IDs format' });
      }
    }

    // Validate userIds
    if (!Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds must be an array' });
    }

    // Check Supabase cache first
    const { data: cachedUsers } = await getCachedData(`user_created_cache_${userIds}`, CACHE_DURATIONS.USER_DATA);

    const cachedMap = new Map(cachedUsers?.map(u => [u.user_id, u.data]) || []);

    // Find uncached user IDs
    const uncachedIds = userIds.filter(id => !cachedMap.has(id));

    // Fetch uncached users in parallel
    const fetchPromises = uncachedIds.map(id =>
      fetchOdinAPI(`/user/${id}/created`)
        .then(data => ({ id, data }))
        .catch(() => null)
    );

    const fetchedUsers = await batchRequests(fetchPromises);

    // Cache new data
    const validFetched = fetchedUsers.filter(u => u !== null);
    if (validFetched.length > 0) {
      await cacheData(`user_created_cache_${userIds}`, validFetched.map(({ id, data }) => ({
        user_id: id,
        data: data,
        updated_at: new Date().toISOString()
      })), CACHE_DURATIONS.USER_DATA);
    }

    // Combine cached and fetched data
    const allUsers = userIds.map(id => cachedMap.get(id) || 
      fetchedUsers.find(u => u?.id === id)?.data || null
    );

    res.json(allUsers);
  } catch (error) {
    console.error('Batch user-created tokens error:', error);
    res.status(500).json({ error: 'Failed to fetch batch user-created tokens' });
  }
});

// ... existing code ...

// Add this new endpoint for batch holders
app.get('/api/batch-holders', async (req, res) => {
  try {
    const { tokenIds } = req.query;
    
    if (!tokenIds) {
      return res.status(400).json({ error: 'tokenIds query parameter is required' });
    }

    let parsedTokenIds;
    try {
      parsedTokenIds = JSON.parse(tokenIds);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid tokenIds format' });
    }

    console.log('Fetching holders for tokens:', parsedTokenIds);

    const holdersPromises = parsedTokenIds.map(async (tokenId) => {
      try {
        const cleanTokenId = tokenId.trim();
        // Using the correct endpoint with a large limit to get all holders
        const url = `https://api.odin.fun/v1/token/${cleanTokenId}/owners?page=1&limit=99999`;
        console.log('Fetching from URL:', url);

        const response = await fetch(url, {
          headers: API_HEADERS
        });

        if (!response.ok) {
          console.error(`Failed to fetch holders for token ${cleanTokenId}:`, response.status);
          return { tokenId: cleanTokenId, holders: [] };
        }

        const data = await response.json();
        
        if (!data || !Array.isArray(data.data)) {
          console.error(`Invalid data structure for token ${cleanTokenId}:`, data);
          return { tokenId: cleanTokenId, holders: [] };
        }

        // Calculate total supply for percentage calculation
        const totalSupply = data.data.reduce((sum, holder) => sum + Number(holder.balance), 0);

        const processedHolders = data.data
          .filter(holder => Number(holder.balance) > 0)
          .map(holder => ({
            user: holder.user,
            user_username: holder.user_username || holder.user.slice(0, 8),
            balance: Number(holder.balance) / 1e11, // Convert to proper units
            percentage: (Number(holder.balance) / totalSupply) * 100 // Calculate percentage
          }))
          .sort((a, b) => Number(b.balance) - Number(a.balance));

        return {
          tokenId: cleanTokenId,
          holders: processedHolders,
          totalHolders: processedHolders.length,
          activeHolders: processedHolders.filter(h => Number(h.balance) > 0).length
        };

      } catch (error) {
        console.error(`Error processing token ${cleanTokenId}:`, error);
        return { 
          tokenId: cleanTokenId, 
          holders: [],
          totalHolders: 0,
          activeHolders: 0
        };
      }
    });

    const results = await Promise.all(holdersPromises);
    const holders = {};
    
    results.forEach(result => {
      if (result && result.tokenId) {
        holders[result.tokenId] = {
          holders: result.holders,
          totalHolders: result.totalHolders,
          activeHolders: result.activeHolders
        };
      }
    });

    res.json(holders);
  } catch (error) {
    console.error('Batch holders error:', error);
    res.status(500).json({ error: 'Failed to fetch batch holders' });
  }
});

// Add this near the other endpoint definitions
app.get('/api/user/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 100, sort = 'time:desc' } = req.query;

    // Check cache first
    const cacheKey = `user_activity_${userId}_${page}_${limit}_${sort}`;
    const { data: cachedData } = await getCachedData(cacheKey, CACHE_DURATION);

    if (cachedData) {
      return res.json(cachedData.data);
    }

    // Fetch from Odin API
    const response = await fetch(
      `https://api.odin.fun/v1/user/${userId}/activity?page=${page}&limit=${limit}&sort=${sort}`,
      {
        headers: {
          ...API_HEADERS,
          'User-Agent': getRandomUserAgent(),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Odin API error: ${response.status}`);
    }

    const data = await response.json();

    // Cache the response
    await cacheData(cacheKey, data, CACHE_DURATION);

    res.json(data);
  } catch (error) {
    console.error('User activity fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user activity',
      data: { data: [] } // Return empty array as fallback
    });
  }
});

// ... existing code ...

// Add this near the top with other constants
const IMAGE_BASE_URL = 'https://images.odin.fun';

// Add this new endpoint for image proxying
app.get('/api/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const imageUrl = `${IMAGE_BASE_URL}${url}`;
    
    const response = await fetch(imageUrl, {
      headers: {
        'Referer': 'https://odin.fun/',
        'Origin': 'https://odin.fun'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Set appropriate headers
    res.set('Content-Type', response.headers.get('content-type'));
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

    // Stream the image data
    response.body.pipe(res);
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

// Update CORS middleware to allow image requests
app.use(cors({
  origin: ['https://odinsmash.com', 'https://odin.fun'],
  credentials: true,
  exposedHeaders: ['Content-Type', 'Cache-Control']
}));

// ... existing code ...

// Add this helper function to calculate PnL
const calculateHolderPnL = async (holders, trades, currentPrice, tokenId) => {
  try {
    // First check if current price is valid
    if (Number(currentPrice.usdPrice) <= 0) {
      // Try to get last valid price from Supabase
      const { data: lastValidPrice } = await getCachedData(`valid_prices_${tokenId}`, CACHE_DURATION);

      if (lastValidPrice) {
        currentPrice = lastValidPrice.price_data;
      } else {
        console.error('No valid price available for token:', tokenId);
        return [];
      }
    } else {
      // If price is valid, cache it
      await cacheData(`valid_prices_${tokenId}`, {
        token_id: tokenId,
        price_data: currentPrice,
        updated_at: new Date().toISOString()
      }, CACHE_DURATION);
    }

    const pnlResults = [];
    const top10Holders = [...holders]
      .sort((a, b) => Number(b.balance) - Number(a.balance))
      .slice(0, 10);

    // Fetch BTC/USD price
    const btcPriceResponse = await fetch('https://mempool.space/api/v1/prices');
    const btcPriceData = await btcPriceResponse.json();
    const btcUsdPrice = btcPriceData.USD;

    for (const holder of top10Holders) {
      // Check cache first
      const { data: cachedHolder } = await getCachedData(`holder_pnl_cache_${holder.user}_${tokenId}`, CACHE_DURATION);

      let avgBuyPriceUSD = cachedHolder?.data?.avgBuyPriceUSD || 0;

      // If avgBuyPriceUSD is 0, try to fetch it
      if (avgBuyPriceUSD === 0) {
        const holderData = {
          holder: holder.user,
          username: holder.user_username || holder.user,
          balance: Number(holder.balance), // Keep in raw units
          totalCostInBTC: 0,
          totalTokensBought: 0,
          totalReceived: 0,
          totalTokensSold: 0,
          trades: [],
          activity: []
        };

        const activityResponse = await fetch(
          `https://api.odin.fun/v1/user/${holder.user}/activity?page=1&limit=100&sort=time:desc`,
          { headers: { ...API_HEADERS, 'User-Agent': getRandomUserAgent() } }
        );

        // Check if the response is not JSON
        if (!activityResponse.headers.get('content-type')?.includes('application/json')) {
          const text = await activityResponse.text();
          console.error('Non-JSON response:', text);
          continue;
        }

        const activity = await activityResponse.json();
        
        for (const trade of activity.data.filter(a => a.token.id === tokenId)) {
          const tokenAmount = Number(trade.amount_token); // Keep in raw units
          const btcAmount = Number(trade.amount_btc) / 1e8; // Convert to BTC

          const tradeInfo = {
            time: trade.time,
            type: trade.action.toLowerCase(),
            tokenAmount,
            btcAmount
          };

          if (trade.action === "BUY") {
            holderData.totalCostInBTC += btcAmount;
            holderData.totalTokensBought += tokenAmount;
          } else if (trade.action === "SELL") {
            holderData.totalReceived += btcAmount;
            holderData.totalTokensSold += tokenAmount;
          }

          holderData.trades.push(tradeInfo);
          holderData.activity.push(trade);
        }

        // Calculate average buy price in USD per token
        avgBuyPriceUSD = holderData.totalTokensBought > 0 
          ? (holderData.totalCostInBTC * btcUsdPrice) / (holderData.totalTokensBought / 1e11) 
          : 0;

        // Scale down avgBuyPriceUSD by dividing by 1e3
        avgBuyPriceUSD = avgBuyPriceUSD / 1e3;

        // Cache the result
        await cacheData(`holder_pnl_cache_${holder.user}_${tokenId}`, {
          holder_id: holder.user,
          token_id: tokenId,
          data: {
            avgBuyPriceUSD,
            lastUpdated: new Date().toISOString()
          }
        }, CACHE_DURATION);
      }

      // Calculate current value in USD
      const currentValueUSD = (Number(holder.balance) / 1e11) * currentPrice.usdPrice;

      // Calculate cost basis in USD
      const costBasisUSD = (Number(holder.balance) / 1e11) * avgBuyPriceUSD;

      // Calculate PnL in USD
      const pnlUSD = currentValueUSD - costBasisUSD;

      pnlResults.push({
        holder: holder.user,
        balance: Number(holder.balance) / 1e11, // Convert to millions
        avgBuyPrice: avgBuyPriceUSD,
        currentValue: currentValueUSD,
        costBasis: costBasisUSD,
        pnl: pnlUSD
      });
    }

    return pnlResults;

  } catch (error) {
    console.error('Error calculating PnL:', error);
    return [];
  }
};

const calculateEntryPrice = async (userId, tokenId) => {
  try {
    // Get user activity
    const activityResponse = await fetch(
      `https://api.odin.fun/v1/user/${userId}/activity?page=1&limit=100&sort=time:desc`
    );
    const activity = await activityResponse.json();

    // Get TV feed data
    const tvFeedResponse = await fetch(
      `https://api.odin.fun/v1/token/${tokenId}/tv_feed?resolution=1&last=350`
    );
    const tvFeedData = await tvFeedResponse.json();

    // Find user's buy trades for this token
    const buyTrades = activity.data.filter(
      trade => trade.token.id === tokenId && trade.action === "BUY"
    );

    // Calculate weighted average entry price
    let totalCost = 0;
    let totalTokens = 0;

    buyTrades.forEach(trade => {
      // Find the corresponding candle in the TV feed
      const tradeTime = new Date(trade.time).getTime() / 1000;
      const candle = tvFeedData.find(
        c => c.time <= tradeTime && tradeTime < c.time + 60
      );

      if (candle) {
        // Use the average of open, high, low, and close as the price
        const price = (candle.open + candle.high + candle.low + candle.close) / 4;
        const tokenAmount = Number(trade.amount_token);
        
        totalCost += price * tokenAmount;
        totalTokens += tokenAmount;
      }
    });

    if (totalTokens === 0) return null;

    const avgEntryPrice = totalCost / totalTokens;
    return avgEntryPrice;
  } catch (error) {
    console.error('Error calculating entry price:', error);
    return null;
  }
};

// Add this new endpoint for whale activity monitoring
app.get('/api/whale-activity/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    // Check cache first with a longer duration since whale activity doesn't change that frequently
    const cacheKey = `whale_activity_${tokenId}`;
    const { data: cachedData } = await getCachedData(cacheKey, 60000);

    if (cachedData?.data) {
      return res.json(cachedData.data);
    }

    // Fetch token info and owners in parallel with timeout
    const [tokenResponse, ownersResponse] = await Promise.all([
      fetchWithTimeout(`https://api.odin.fun/v1/token/${tokenId}`, {}, 5000),
      fetchWithTimeout(`https://api.odin.fun/v1/token/${tokenId}/owners?page=1&limit=5`, {}, 5000)
    ]);

    if (!tokenResponse || !ownersResponse) {
      throw new Error('Failed to fetch token data');
    }

    // Access the correct data structure from the API response
    const tokenInfo = tokenResponse;
    const owners = ownersResponse.data || [];

    // Calculate whale threshold based on token's volume
    const volume24h = tokenInfo.volume || 0;
    const WHALE_THRESHOLD_PERCENTAGE = 0.01; // 1% of 24h volume
    const whaleThresholdBTC = Math.max(
      (volume24h * WHALE_THRESHOLD_PERCENTAGE),
      0.005 // Minimum threshold of 0.005 BTC
    );
    
    // Get top 5 holders (whales)
    const whales = owners
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5)
      .map(holder => holder.user);

    // Fetch all whale activities in parallel with a smaller limit and timeout
    const whaleActivitiesPromises = whales.map(whaleId => 
      fetchWithTimeout(
        `https://api.odin.fun/v1/user/${whaleId}/activity?page=1&limit=5&sort=time:desc`,
        {},
        5000
      )
    );

    const whaleActivities = await Promise.all(whaleActivitiesPromises);
    const validActivities = whaleActivities.filter(Boolean);

    // Process whale activities
    const WHALE_MIN_BTC = whaleThresholdBTC * 100000000; // Convert to satoshis
    const allActivities = validActivities
      .flatMap(data => data.data || [])
      .filter(activity => 
        activity.token.id === tokenId &&
        ['BUY', 'SELL'].includes(activity.action) &&
        Number(activity.amount_btc) >= WHALE_MIN_BTC
      )
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 10); // Limit to 10 most recent activities

    // Calculate metrics
    const buyVolume = allActivities
      .filter(a => a.action === 'BUY')
      .reduce((sum, a) => sum + Number(a.amount_btc), 0);

    const sellVolume = allActivities
      .filter(a => a.action === 'SELL')
      .reduce((sum, a) => sum + Number(a.amount_btc), 0);

    const totalVolume = buyVolume + sellVolume;
    const buyPercentage = totalVolume > 0 ? (buyVolume / totalVolume) * 100 : 0;
    const sellPercentage = totalVolume > 0 ? (sellVolume / totalVolume) * 100 : 0;

    // Format response
    const response = {
      buyVsSell: {
        buys: buyPercentage,
        sells: sellPercentage,
        totalVolume: totalVolume / 100000000
      },
      holdingsDistribution: {
        labels: owners.map(h => h.user_username || h.user.slice(0, 8)),
        values: owners.map(h => h.balance / 100000000)
      },
      recentTrades: allActivities.map(activity => ({
        type: activity.action.toLowerCase(),
        amount: Number(activity.amount_btc) / 100000000,
        time: activity.time,
        user: activity.user_username || activity.user.slice(0, 8)
      }))
    };

    // Cache the result for 1 minute
    await cacheData(cacheKey, response, 60000);

    res.json(response);
  } catch (error) {
    console.error('Whale activity error:', error);
    res.status(500).json({ error: 'Failed to fetch whale activity' });
  }
});

// Add this endpoint for all tokens
app.get('/api/all-tokens', async (req, res) => {
  try {
    // Try to read from cache file first
    try {
      const fileContent = await fs.readFile(TOKENS_CACHE_FILE, 'utf-8');
      const cacheData = JSON.parse(fileContent);
      
      // If cache exists and is not too old
      if (cacheData && cacheData.lastUpdated && Date.now() - cacheData.lastUpdated < 60000) {
        console.log('Serving tokens from cache');
        return res.json({
          tokenIds: cacheData.tokenIds,
          data: cacheData.data,
          pagination: {
            currentPage: 1,
            totalTokens: cacheData.tokenIds.length,
            hasMore: false
          }
        });
      }
    } catch (err) {
      console.log('Cache miss or invalid, fetching fresh data');
    }

    // If cache is stale or doesn't exist, fetch fresh data
    const response = await fetch('https://api.odin.fun/v1/tokens?page=1&limit=99999&sort=volume:desc', {
      headers: {
        ...API_HEADERS,
        'User-Agent': getRandomUserAgent(),
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.data) {
      throw new Error('Invalid response format from API');
    }

    const processedData = {
      tokenIds: data.data.map(t => t.id),
      data: data.data,
      lastUpdated: Date.now()
    };

    // Update cache in background
    fs.writeFile(
      TOKENS_CACHE_FILE,
      JSON.stringify(processedData, null, 2)
    ).catch(console.error);

    // Send response
    res.json({
      tokenIds: processedData.tokenIds,
      data: processedData.data,
      pagination: {
        currentPage: 1,
        totalTokens: processedData.tokenIds.length,
        hasMore: false
      }
    });
  } catch (error) {
    console.error('Error in /api/all-tokens:', error);

    // Try to serve stale cache if available
    try {
      const fileContent = await fs.readFile(TOKENS_CACHE_FILE, 'utf-8');
      const cacheData = JSON.parse(fileContent);
      if (cacheData && cacheData.data && cacheData.tokenIds) {
        console.log('Serving stale cache due to error');
        return res.json({
          tokenIds: cacheData.tokenIds,
          data: cacheData.data,
          pagination: {
            currentPage: 1,
            totalTokens: cacheData.tokenIds.length,
            hasMore: false
          }
        });
      }
    } catch (err) {
      // If everything fails, return error
      console.error('Failed to read cache file:', err);
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch token data',
      details: error.message
    });
  }
});

// Add a separate endpoint for detailed token metrics
app.get('/api/token-metrics/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    console.log(`Fetching metrics for token: ${tokenId}`);
    
    // Check cache first
    const cacheKey = `token_metrics_${tokenId}`;
    const { data: cachedMetrics } = await getCachedData(cacheKey, CACHE_DURATION) || {};

    if (cachedMetrics) {
      console.log('Returning cached metrics');
      return res.json(cachedMetrics);
    }

    // Fetch required data in parallel
    const [tokenResponse, tradesResponse, holdersResponse] = await Promise.all([
      fetchWithHeaders(`https://api.odin.fun/v1/token/${tokenId}`),
      fetchWithHeaders(`https://api.odin.fun/v1/token/${tokenId}/trades?page=1&limit=9999`),
      fetchWithHeaders(`https://api.odin.fun/v1/token/${tokenId}/owners?page=1&limit=99999`)
    ]);

    if (!tokenResponse || !tradesResponse || !holdersResponse) {
      throw new Error('Failed to fetch required data');
    }

    const trades = tradesResponse.data || [];
    const holders = holdersResponse.data || [];
    
    // Calculate current and previous holder counts
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get current active holders (balance > 0)
    const currentHolders = holders.filter(h => Number(h.balance) > 0).length;

    // Get previous day holders by looking at trades
    const dailyTrades = trades.filter(t => new Date(t.time) > oneDayAgo);
    const uniqueHoldersBeforeDay = new Set();
    dailyTrades.forEach(trade => {
      if (trade.action === "SELL") uniqueHoldersBeforeDay.add(trade.user);
    });
    const previousDayHolders = Math.max(currentHolders - uniqueHoldersBeforeDay.size, 0);

    // Get previous week holders
    const weeklyTrades = trades.filter(t => new Date(t.time) > oneWeekAgo);
    const uniqueHoldersBeforeWeek = new Set();
    weeklyTrades.forEach(trade => {
      if (trade.action === "SELL") uniqueHoldersBeforeWeek.add(trade.user);
    });
    const previousWeekHolders = Math.max(currentHolders - uniqueHoldersBeforeWeek.size, 0);

    // Calculate growth rates
    const dailyGrowthRate = previousDayHolders > 0 
      ? ((currentHolders - previousDayHolders) / previousDayHolders) * 100 
      : 0;

    const weeklyGrowthRate = previousWeekHolders > 0 
      ? ((currentHolders - previousWeekHolders) / previousWeekHolders) * 100 
      : 0;

    // Calculate retention rate
    const retentionRate = previousDayHolders > 0 
      ? (currentHolders / previousDayHolders) * 100 
      : 100;

    const metrics = {
      dailyGrowth: {
        current: currentHolders,
        previous: previousDayHolders,
        growthRate: dailyGrowthRate,
        newHolders: currentHolders - previousDayHolders
      },
      weeklyGrowth: {
        current: currentHolders,
        previous: previousWeekHolders,
        growthRate: weeklyGrowthRate,
        newHolders: currentHolders - previousWeekHolders
      },
      retentionRate: Math.min(retentionRate, 100), // Cap at 100%
      volumeMetrics: calculateVolumeMetrics(trades, tokenResponse.price || 0)
    };

    // Cache the metrics
    await cacheData(cacheKey, metrics, CACHE_DURATION);

    console.log('Sending fresh metrics:', {
      currentHolders,
      previousDayHolders,
      dailyGrowthRate,
      retentionRate
    });

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching token metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch token metrics',
      details: error.message 
    });
  }
});

// ... existing code ...

// Add a new endpoint to fetch PnL for a specific holder
app.get('/api/holder/:holderId/pnl', async (req, res) => {
  const { holderId } = req.params;
  const { tokenId } = req.query; // Assume tokenId is passed as a query parameter

  try {
    // Use the same logic as calculateHolderPnL to fetch PnL for a specific holder
    const pnlData = await calculatePnLForHolder(holderId, tokenId);

    res.json({ pnl: pnlData });
  } catch (error) {
    console.error(`Error fetching PnL for holder ${holderId}:`, error);
    res.status(500).json({ error: 'Failed to fetch PnL data' });
  }
});

// Add this new function (do NOT add any new express requires or routes)
// ... existing code ...

const calculatePnLForHolder = async (holderId, tokenId) => {
  try {
    // Check cache first
    const { data: cachedHolder } = await getCachedData(`holder_pnl_cache_${holderId}_${tokenId}`, CACHE_DURATION);

    if (cachedHolder?.data?.pnl) {
      console.log('Using cached PnL data for holder:', holderId);
      return cachedHolder.data.pnl;
    }

    const holderData = {
      totalCostInBTC: 0,
      totalTokensBought: 0,
      totalReceived: 0,
      totalTokensSold: 0
    };

    // Fetch BTC/USD price
    const btcPriceResponse = await fetch('https://mempool.space/api/v1/prices');
    const btcPriceData = await btcPriceResponse.json();
    const btcUsdPrice = btcPriceData.USD;

    // Use fetchWithHeaders instead of direct fetch for Odin API
    const activityData = await fetchWithHeaders(
      `https://api.odin.fun/v1/user/${holderId}/activity?page=1&limit=100&sort=time:desc`
    );

    if (!activityData) {
      console.error('Failed to fetch activity data for holder:', holderId);
      return 0;
    }

    // Process trades
    for (const trade of activityData.data.filter(a => a.token.id === tokenId)) {
      const tokenAmount = Number(trade.amount_token);
      const btcAmount = Number(trade.amount_btc) / 1e8;

      if (trade.action === "BUY") {
        holderData.totalCostInBTC += btcAmount;
        holderData.totalTokensBought += tokenAmount;
      } else if (trade.action === "SELL") {
        holderData.totalReceived += btcAmount;
        holderData.totalTokensSold += tokenAmount;
      }
    }

    // Rest of the calculation code...
    
    // Calculate average buy price in USD per token
    const avgBuyPriceUSD = holderData.totalTokensBought > 0 
      ? (holderData.totalCostInBTC * btcUsdPrice) / (holderData.totalTokensBought / 1e11) / 1e3
      : 0;

    // Use fetchWithHeaders for current price
    const currentPriceData = await fetchWithHeaders(`https://api.odin.fun/v1/token/${tokenId}`);
    const currentPrice = currentPriceData ? Number(currentPriceData.price) / 1e8 : 0;

    // Use fetchWithHeaders for balance
    const holdersData = await fetchWithHeaders(`https://api.odin.fun/v1/token/${tokenId}/owners`);
    const holder = holdersData?.data?.find(h => h.user === holderId);
    const currentBalance = holder ? Number(holder.balance) / 1e11 : 0;

    // Calculate PnL
    const currentValueUSD = currentBalance * currentPrice * btcUsdPrice;
    const costBasisUSD = currentBalance * avgBuyPriceUSD;
    const pnlUSD = currentValueUSD - costBasisUSD;

    // Cache the result
    await cacheData(`holder_pnl_cache_${holderId}_${tokenId}`, {
      holder_id: holderId,
      token_id: tokenId,
      data: {
        pnl: pnlUSD,
        avgBuyPriceUSD,
        lastUpdated: new Date().toISOString()
      }
    }, CACHE_DURATION);

    return pnlUSD;

  } catch (error) {
    console.error('Error calculating PnL for holder:', error);
    return 0;
  }
};

// ... existing code ...

// Add this new endpoint for token metrics
app.get('/api/token/:tokenId/metrics', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    // Check cache first
    const { data: cachedMetrics } = await getCachedData(`token_metrics_cache_${tokenId}`, CACHE_DURATION);

    if (cachedMetrics) {
      return res.json(cachedMetrics.data);
    }

    // Fetch trades from Odin API
    const tradesData = await fetchWithHeaders(
      `https://api.odin.fun/v1/token/${tokenId}/trades?page=1&limit=9999`
    );

    if (!tradesData || !tradesData.data) {
      throw new Error('Failed to fetch trades data');
    }

    const trades = tradesData.data;
    const now = new Date();
    const last24h = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const last7d = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    // Calculate 24h metrics
    const trades24h = trades.filter(tx => new Date(tx.time) > last24h);
    const buyTrades = trades24h.filter(tx => tx.buy);
    const sellTrades = trades24h.filter(tx => !tx.buy);

    // Calculate BTC volumes
    const volume24h = trades24h.reduce((sum, tx) => sum + (Number(tx.amount_btc) / 1e8), 0);
    const buyVolume24h = buyTrades.reduce((sum, tx) => sum + (Number(tx.amount_btc) / 1e8), 0);
    const sellVolume24h = sellTrades.reduce((sum, tx) => sum + (Number(tx.amount_btc) / 1e8), 0);

    // Calculate 7d average
    const trades7d = trades.filter(tx => {
      const txTime = new Date(tx.time);
      return txTime > last7d && txTime <= last24h;
    });
    const volume7d = trades7d.reduce((sum, tx) => sum + (Number(tx.amount_btc) / 1e8), 0);
    const averageDailyVolume = volume7d / 6;

    // Get BTC/USD price
    const btcPriceResponse = await fetch('https://mempool.space/api/v1/prices');
    const btcPriceData = await btcPriceResponse.json();
    const btcUsdPrice = btcPriceData.USD;

    const metrics = {
      volume24h,
      averageDailyVolume,
      tradeCount24h: trades24h.length,
      buyVolume24h,
      sellVolume24h,
      buySellRatio: sellVolume24h > 0 ? buyVolume24h / sellVolume24h : 1,
      spikeRatio: averageDailyVolume > 0 ? volume24h / averageDailyVolume : 1,
      // Add USD values
      volume24hUSD: volume24h * btcUsdPrice,
      averageDailyVolumeUSD: averageDailyVolume * btcUsdPrice,
      buyVolumeUSD: buyVolume24h * btcUsdPrice,
      sellVolumeUSD: sellVolume24h * btcUsdPrice
    };

    // Cache the metrics
    await cacheData(`token_metrics_cache_${tokenId}`, metrics, CACHE_DURATION);

    res.json(metrics);
  } catch (error) {
    console.error('Token metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch token metrics' });
  }
});

// ... existing code ...

// ... existing code ...

// Add these near the top with other constants
const TOKEN_CACHE_DURATION = 30000; // 30 seconds
// const NEW_TOKEN_POLL_INTERVAL = 30000; // 30 seconds
const MAX_CONCURRENT_REQUESTS = 3; // Limit concurrent API calls

// Helper function to check for new tokens
// const checkForNewTokens = async () => {
//   try {
//     const cacheKey = 'latest_token_check';
    
//     // Check if we've checked recently
//     const { data: lastCheck } = await supabase
//       .from('system_cache')
//       .select('*')
//       .eq('cache_key', cacheKey)
//       .gt('updated_at', new Date(Date.now() - TOKEN_CACHE_DURATION).toISOString())
//       .single();

//     if (lastCheck) {
//       return; // Skip if checked recently
//     }

//     const response = await fetchWithHeaders('/tokens?limit=1&sort=created_time:desc');
//     if (!response?.data?.[0]) return;

//     const latestToken = response.data[0];
    
//     // Check cache
//     const { data: cachedToken } = await supabase
//       .from('tokens')
//       .select('*')
//       .eq('id', latestToken.id)
//       .single();

//     if (!cachedToken) {
//       await supabase
//         .from('tokens')
//         .upsert({
//           id: latestToken.id,
//           data: latestToken,
//           updated_at: new Date().toISOString()
//         });
      
//       console.log(`New token detected: ${latestToken.name} (${latestToken.id})`);
//     }

//     // Update last check time
//     await supabase
//       .from('system_cache')
//       .upsert({
//         cache_key: cacheKey,
//         updated_at: new Date().toISOString()
//       });

//   } catch (error) {
//     console.error('Error checking for new tokens:', error);
//   }
// };

// Interval moved to bottom of file
// setInterval(checkForNewTokens, NEW_TOKEN_POLL_INTERVAL);

    // Check cache first
    app.get('/api/tokens', async (req, res) => {
      try {
        // Check cache first
        const cachedResult = await getCachedData('all_tokens_cache', TOKEN_CACHE_DURATION);
        if (cachedResult) {
          console.log('Returning cached tokens');
          return res.json(cachedResult);
        }
    
        console.log('No valid cache found, fetching from API');
        // Single API call to get tokens with all needed data
        const { sort = 'created_time:desc', page = '1', limit = '20' } = req.query;
        const data = await fetchOdinAPI('/tokens', { sort, page, limit });
    
        // Cache the new data
        await cacheData('all_tokens_cache', data, TOKEN_CACHE_DURATION);
    
        res.json(data);
      } catch (error) {
        console.error('Tokens fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch tokens' });
      }
    });
// ... existing code ...

// Add this helper function for fetching with timeout
const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...API_HEADERS,
        'User-Agent': getRandomUserAgent(),
      }
    });

    clearTimeout(id);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// Update the processTokensInBatches function
async function processTokensInBatches(tokens, batchSize = BATCH_SIZE) {
  const results = [];
  const totalBatches = Math.ceil(tokens.length / batchSize);
  let processedCount = 0;
  
  // Only process first 100 tokens initially
  const tokensToProcess = tokens.slice(0, INITIAL_TOKEN_LIMIT);
  const initialBatches = Math.ceil(tokensToProcess.length / batchSize);
  
  console.log(`Processing ${tokensToProcess.length} tokens in ${initialBatches} batches...`);
  
  for (let i = 0; i < tokensToProcess.length; i += batchSize) {
    const batch = tokensToProcess.slice(i, i + batchSize);
    processedCount++;
    
    try {
      const batchResults = await Promise.all(
        batch.map(async (token) => {
          try {
            // Use fetchWithHeaders instead of fetchWithTimeout
            const data = await fetchWithHeaders(`https://api.odin.fun/v1/token/${token.id}`);
            if (!data) {
              console.error(`No data returned for token ${token.id}`);
              return null;
            }
            return {
              id: token.id,
              ...data,
              volumeMetrics: calculateVolumeMetrics(data.trades || [], data.price || 0)
            };
          } catch (error) {
            console.error(`Error processing token ${token.id}:`, error.message);
            return null;
          }
        })
      );
      
      results.push(...batchResults.filter(Boolean));
      
      // Log progress every 10 batches
      if (processedCount % 10 === 0) {
        const progress = Math.round((processedCount / initialBatches) * 100);
        console.log(`Progress: ${progress}% (${processedCount}/${initialBatches} batches)`);
      }
      
      // Add delay between batches to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      
    } catch (error) {
      console.error(`Error processing batch ${processedCount}:`, error.message);
      // Add longer delay on error
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY * 2));
    }
  }
  
  console.log(`Completed processing ${results.length} tokens`);
  return results;
}

// ... existing code ...

// Add the dashboard endpoint
app.get('/api/dashboard/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    // Check cache first
    const cacheKey = `dashboard_${tokenId}`;
    const { data: cachedData } = await getCachedData(cacheKey, CACHE_DURATION);

    if (cachedData?.data) {
      return res.json(cachedData.data);
    }

    // Fetch all required data in parallel
    const [tokenData, whaleActivity, holdersData, tradesData] = await Promise.all([
      fetchWithTimeout(`https://api.odin.fun/v1/token/${tokenId}`, {}, 5000),
      fetchWithTimeout(`http://localhost:3001/api/whale-activity/${tokenId}`, {}, 5000),
      fetchWithTimeout(`https://api.odin.fun/v1/token/${tokenId}/owners?page=1&limit=100`, {}, 5000),
      fetchWithTimeout(`https://api.odin.fun/v1/token/${tokenId}/trades?page=1&limit=9999`, {}, 5000)
    ]);

    if (!tokenData || !whaleActivity || !holdersData || !tradesData) {
      throw new Error('Failed to fetch required data');
    }

    // Process the data
    const dashboardData = {
      token: tokenData,
      whaleActivity: whaleActivity,
      holders: holdersData.data || [],
      trades: tradesData.data || [],
      metrics: calculateVolumeMetrics(tradesData.data || [], btcPriceData.USD)
    };

    // Cache the result
    await cacheData(cacheKey, dashboardData, CACHE_DURATION);

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data',
      details: error.message
    });
  }
});

// ... existing code ...
app.get('/tokens/trending', async (req, res) => {
  try {
    // Check cache first
    const { data: cachedTokens } = await getCachedData('trending_tokens_cache', 30000);

    if (cachedTokens?.data) {
      return res.json(cachedTokens.data);
    }

    // Fetch tokens from Odin API sorted by volume
    const response = await fetch('https://api.odin.fun/v1/tokens?limit=100&sort=volume:desc', {
      headers: {
        ...API_HEADERS,
        'User-Agent': getRandomUserAgent(),
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.status}`);
    }

    const data = await response.json();

    // Get top 5 tokens by volume
    const trendingTokens = data.data
      .slice(0, 5)
      .map(token => ({
        id: token.id,
        name: token.name,
        ticker: token.ticker,
        price_change_24h: token.price_change_24h || 0,
        volume: token.volume || 0,
        trade_count_24h: token.trade_count_24h || 0
      }));

    // Cache the results
    await cacheData('trending_tokens_cache', { data: trendingTokens }, 30000);

    res.json(trendingTokens);
  } catch (error) {
    console.error('Error fetching trending tokens:', error);
    res.status(500).json([]);
  }
}); 

app.get('/btc-price', async (req, res) => {
  try {
    // Check cache first
    const cachedPrice = await checkCache('btc_price');
    if (cachedPrice) {
      return res.json(cachedPrice);
    }

    const response = await fetch('https://mempool.space/api/v1/prices', {
      headers: {
        'User-Agent': getRandomUserAgent()
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch BTC price: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the price for 1 minute
    await cacheData('btc_price', data, 60);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching BTC price:', error);
    res.status(500).json({ error: 'Failed to fetch BTC price' });
  }
}); 

async function checkCache(key) {
  try {
    const data = await getCachedData(key, CACHE_DURATION);
    return data || null;
  } catch (error) {
    console.error('Error checking cache:', error);
    return null;
  }
}

async function getExpiredCache(key) {
  try {
    const data = await getCachedData(key, CACHE_DURATION);
    return data || null;
  } catch (error) {
    console.error('Error getting expired cache:', error);
    return null;
  }
}

// ... existing code ...

// Add BTC price endpoint
app.get('/api/btc-price', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'btc_price';
    const { data: cachedPrice } = await getCachedData(cacheKey, 60000) || {};  // 1 minute cache

    if (cachedPrice) {
      return res.json(cachedPrice);
    }

    // Fetch from mempool.space API
    const response = await fetch('https://mempool.space/api/v1/prices', {
      headers: {
        'User-Agent': getRandomUserAgent()
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch BTC price: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the price
    await cacheData(cacheKey, data, 60000);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching BTC price:', error);
    res.status(500).json({ 
      error: 'Failed to fetch BTC price',
      message: error.message 
    });
  }
});

// ... existing code ...

// ... existing code ...
// Add this new endpoint for holder growth metrics
app.get('/api/token-metrics/:tokenId/holder-growth', async (req, res) => {
  try {
    const { tokenId } = req.params;
    console.log(`Fetching holder growth metrics for token: ${tokenId}`);

    // Check cache first with proper null handling
    const cacheKey = `holder_growth_${tokenId}`;
    const cachedResult = await getCachedData(cacheKey, CACHE_DURATION);
    const cachedData = cachedResult?.data;

    if (cachedData) {
      console.log('Returning cached holder growth data');
      return res.json(cachedData);
    }

    // Fetch current holders
    const holdersResponse = await fetchWithHeaders(`https://api.odin.fun/v1/token/${tokenId}/owners?page=1&limit=9999`);
    if (!holdersResponse || !holdersResponse.data) {
      throw new Error('Failed to fetch holders data');
    }

    // Get token data for creation time
    const tokenResponse = await fetchWithHeaders(`https://api.odin.fun/v1/token/${tokenId}`);
    if (!tokenResponse) {
      throw new Error('Failed to fetch token data');
    }

    const currentHolders = holdersResponse.data.length;
    const creationTime = new Date(tokenResponse.created_time);
    const now = new Date();
    const daysSinceCreation = Math.max(1, Math.floor((now - creationTime) / (24 * 60 * 60 * 1000)));

    // Calculate metrics
    const holderGrowthMetrics = {
      dailyGrowth: {
        current: currentHolders,
        previous: currentHolders,
        growthRate: 0,
        newHolders: 0
      },
      weeklyGrowth: {
        current: currentHolders,
        previous: currentHolders,
        growthRate: 0,
        newHolders: 0
      },
      retentionRate: 100
    };

    // Try to get historical data from cache with proper null handling
    const historicalKey = `historical_holders_${tokenId}`;
    const historicalResult = await getCachedData(historicalKey);
    const historicalData = historicalResult?.data;

    if (historicalData) {
      // Calculate daily growth
      if (historicalData.dailyHolders) {
        holderGrowthMetrics.dailyGrowth.previous = historicalData.dailyHolders;
        holderGrowthMetrics.dailyGrowth.newHolders = currentHolders - historicalData.dailyHolders;
        holderGrowthMetrics.dailyGrowth.growthRate = historicalData.dailyHolders > 0 
          ? ((currentHolders - historicalData.dailyHolders) / historicalData.dailyHolders) * 100 
          : 0;
      }

      // Calculate weekly growth
      if (historicalData.weeklyHolders) {
        holderGrowthMetrics.weeklyGrowth.previous = historicalData.weeklyHolders;
        holderGrowthMetrics.weeklyGrowth.newHolders = currentHolders - historicalData.weeklyHolders;
        holderGrowthMetrics.weeklyGrowth.growthRate = historicalData.weeklyHolders > 0 
          ? ((currentHolders - historicalData.weeklyHolders) / historicalData.weeklyHolders) * 100 
          : 0;
      }

      // Calculate retention rate
      if (historicalData.totalHolders > 0) {
        const retainedHolders = holdersResponse.data.filter(holder => 
          historicalData.holderIds.includes(holder.user)
        ).length;
        holderGrowthMetrics.retentionRate = (retainedHolders / historicalData.totalHolders) * 100;
      }
    }

    // Update historical data
    const newHistoricalData = {
      dailyHolders: currentHolders,
      weeklyHolders: historicalData?.weeklyHolders || currentHolders,
      totalHolders: currentHolders,
      holderIds: holdersResponse.data.map(holder => holder.user),
      lastUpdated: new Date().toISOString()
    };

    // Cache the results
    await cacheData(cacheKey, holderGrowthMetrics, CACHE_DURATION);
    await cacheData(historicalKey, newHistoricalData, 7 * 24 * 60 * 60 * 1000); // Cache historical data for 7 days

    console.log('Sending fresh holder growth metrics:', holderGrowthMetrics);
    res.json(holderGrowthMetrics);

  } catch (error) {
    console.error('Error fetching holder growth:', error);
    res.status(500).json({ 
      error: 'Failed to fetch holder growth metrics',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Add this near other endpoints
app.get('/api/token/:tokenId/holders-pnl', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    // Check cache first with a shorter duration for active development
    const cacheKey = `holders_pnl_${tokenId}`;
    const cachedResult = await getCachedData(cacheKey, CACHE_DURATION);

    if (cachedResult?.data) {
      console.log('Returning cached holders PnL data');
      return res.json(cachedResult);
    }

    // Fetch required data in parallel with timeouts
    const [holdersResponse, btcPriceResponse, tokenResponse] = await Promise.all([
      fetchWithTimeout(`https://api.odin.fun/v1/token/${tokenId}/owners?page=1&limit=100`, {}, 3000),
      fetchWithTimeout('https://mempool.space/api/v1/prices', {}, 2000),
      fetchWithTimeout(`https://api.odin.fun/v1/token/${tokenId}`, {}, 3000)
    ]);

    if (!holdersResponse?.data) {
      console.error('No holders data received from Odin API');
      return res.json({ data: [] });
    }

    // Filter out holders with zero balance and sort by balance
    const activeHolders = holdersResponse.data
      .filter(h => Number(h.balance) > 0)
      .sort((a, b) => Number(b.balance) - Number(a.balance))
      .slice(0, 20); // Only process top 20 holders for performance

    console.log(`Processing ${activeHolders.length} active holders out of ${holdersResponse.data.length} total`);
    
    if (activeHolders.length === 0) {
      console.log('Token has no active holders');
      return res.json({ data: [] });
    }

    const btcUsdPrice = btcPriceResponse.ok ? (await btcPriceResponse.json()).USD : 0;
    const tokenData = tokenResponse;
    const currentPriceBTC = Number(tokenData.price) / 1e8;
    const currentPriceUSD = currentPriceBTC * btcUsdPrice;

    // Create a map for quick holder lookup
    const holderMap = new Map(activeHolders.map(h => [h.user, h]));

    // Process holders in parallel with a concurrency limit
    const concurrencyLimit = 5;
    const processHolderBatch = async (holders) => {
      const results = [];
      for (let i = 0; i < holders.length; i += concurrencyLimit) {
        const batch = holders.slice(i, i + concurrencyLimit);
        const batchResults = await Promise.all(
          batch.map(async (holder) => {
            try {
              // Check holder cache first
              const holderCacheKey = `holder_pnl_${holder.user}_${tokenId}`;
              const cachedHolder = await getCachedData(holderCacheKey, CACHE_DURATION);
              
              if (cachedHolder?.data?.pnl !== undefined) {
                return {
                  ...holder,
                  pnl: cachedHolder.data.pnl,
                  isTrustedDev: TRUSTED_DEVELOPERS.includes(holder.user)
                };
              }

              // Fetch only last 50 trades for efficiency
              const activityResponse = await fetchWithTimeout(
                `https://api.odin.fun/v1/user/${holder.user}/activity?page=1&limit=50&sort=time:desc`,
                {},
                3000
              );

              if (!activityResponse?.data) {
                return { 
                  ...holder, 
                  pnl: 0,
                  isTrustedDev: TRUSTED_DEVELOPERS.includes(holder.user)
                };
              }

              // Filter trades for this token and calculate metrics
              const trades = activityResponse.data.filter(trade => trade.token.id === tokenId);
              let totalCostBTC = 0;
              let totalTokensBought = 0;

              for (const trade of trades) {
                if (trade.action === "BUY") {
                  totalCostBTC += Number(trade.amount_btc) / 1e8;
                  totalTokensBought += Number(trade.amount_token) / 1e11;
                }
              }

              const avgBuyPriceBTC = totalTokensBought > 0 
                ? totalCostBTC / totalTokensBought 
                : currentPriceBTC;

              const currentHoldings = Number(holder.balance) / 1e11;
              const costBasisUSD = (avgBuyPriceBTC * btcUsdPrice * currentHoldings) / 1e3;
              const currentValueUSD = (currentPriceUSD * currentHoldings) / 1e3;
              const pnlUSD = currentValueUSD - costBasisUSD;

              // Cache individual holder PnL
              await cacheData(holderCacheKey, {
                data: {
                  pnl: pnlUSD,
                  lastUpdated: new Date().toISOString()
                }
              }, CACHE_DURATION);

              return {
                ...holder,
                pnl: pnlUSD,
                isTrustedDev: TRUSTED_DEVELOPERS.includes(holder.user)
              };
            } catch (error) {
              console.error(`Error processing holder ${holder.user}:`, error);
              return { 
                ...holder, 
                pnl: 0,
                isTrustedDev: TRUSTED_DEVELOPERS.includes(holder.user)
              };
            }
          })
        );
        results.push(...batchResults);
      }
      return results;
    };

    const holdersWithPnL = await processHolderBatch(activeHolders);
    const result = { data: holdersWithPnL };

    // Cache the final result
    await cacheData(cacheKey, result, CACHE_DURATION);

    res.json(result);
  } catch (error) {
    console.error('Holders PnL error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch holders PnL',
      message: error.message,
      data: [] 
    });
  }
});

// Add these constants near the top
const TOKENS_CACHE_FILE = path.join(process.cwd(), 'tokens-cache.json');
const TOKENS_UPDATE_INTERVAL = 30000; // 30 seconds

// Add this function to handle token updates
async function updateTokensCache() {
  try {
    // Fetch latest tokens with correct endpoint
    const response = await fetch('https://api.odin.fun/v1/tokens?page=1&limit=99999&sort=volume:desc', {
      headers: {
        ...API_HEADERS,
        'User-Agent': getRandomUserAgent(),
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.status}`);
    }

    const newData = await response.json();
    
    if (!newData || !newData.data) {
      throw new Error('Invalid response format from API');
    }

    const processedData = {
      tokenIds: newData.data.map(t => t.id),
      data: newData.data,
      lastUpdated: Date.now()
    };

    // Read existing cache
    let existingData = { tokenIds: [], data: [], lastUpdated: 0 };
    try {
      const fileContent = await fs.readFile(TOKENS_CACHE_FILE, 'utf-8');
      existingData = JSON.parse(fileContent);
    } catch (err) {
      // File doesn't exist or is invalid, will create new one
      console.log('No existing cache found, creating new cache file');
    }

    // Check if we have new tokens
    const newTokenIds = new Set(processedData.tokenIds);
    const oldTokenIds = new Set(existingData.tokenIds);
    const hasNewTokens = processedData.tokenIds.some(id => !oldTokenIds.has(id));
    const hasRemovedTokens = existingData.tokenIds.some(id => !newTokenIds.has(id));

    if (hasNewTokens || hasRemovedTokens || !existingData.lastUpdated) {
      console.log('New or removed tokens detected, updating cache...');
      // Update cache file
      await fs.writeFile(
        TOKENS_CACHE_FILE,
        JSON.stringify(processedData, null, 2)
      );
      console.log('Cache updated successfully');
    } else {
      console.log('No new tokens detected, cache is up to date');
    }
  } catch (error) {
    console.error('Error updating tokens cache:', error);
  }
}

// Start background update process when server starts
setInterval(updateTokensCache, TOKENS_UPDATE_INTERVAL);
// Also update immediately when server starts
updateTokensCache().catch(console.error);

// Add these endpoints after the existing ones

// 1. Endpoint for fetching tokens with risk assessment
app.get('/api/safe-tokens', async (req, res) => {
    try {
        const response = await fetch('https://api.odin.fun/v1/tokens?page=1&limit=100&sort=created_time:desc', {
            headers: API_HEADERS
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch tokens: ${response.status}`);
        }

        const data = await response.json();
        const tokens = data.data || [];

        // Add risk assessment for each token
        const tokensWithRisk = await Promise.all(tokens.map(async (token) => {
            try {
                // Fetch holders data
                const holdersResponse = await fetch(
                    `https://api.odin.fun/v1/token/${token.id}/owners?page=1&limit=100`,
                    { headers: API_HEADERS }
                );
                const holdersData = await holdersResponse.json();
                const holders = holdersData.data || [];

                // Calculate risk metrics
                const devHolder = holders.find(h => h.user === token.creator);
                const devBalance = devHolder ? Number(devHolder.balance) : 0;
                const devPercentage = (devBalance / Number(token.total_supply)) * 100;

                const sortedHolders = [...holders].sort((a, b) => Number(b.balance) - Number(a.balance));
                const top5Balance = sortedHolders.slice(0, 5).reduce((sum, h) => sum + Number(h.balance), 0);
                const top5Percentage = (top5Balance / Number(token.total_supply)) * 100;

                // Determine risk level
                let riskLevel = 'high';
                if (devPercentage >= 5 || top5Percentage >= 20) {
                    riskLevel = 'low';
                } else if (devPercentage >= 2 || top5Percentage >= 10) {
                    riskLevel = 'guarded';
                }

                return {
                    ...token,
                    riskLevel,
                    metrics: {
                        devPercentage,
                        top5Percentage,
                        holderCount: holders.length
                    }
                };
            } catch (error) {
                console.error(`Error processing token ${token.id}:`, error);
                return { ...token, riskLevel: 'unknown' };
            }
        }));

        res.json(tokensWithRisk);
    } catch (error) {
        console.error('Error fetching safe tokens:', error);
        res.status(500).json({ error: 'Failed to fetch safe tokens' });
    }
});

// 2. Endpoint for token holders with detailed metrics
app.get('/api/token/:tokenId/holders-metrics', async (req, res) => {
    try {
        const { tokenId } = req.params;
        
        // Fetch holders data
        const holdersResponse = await fetch(
            `https://api.odin.fun/v1/token/${tokenId}/owners?page=1&limit=100`,
            { headers: API_HEADERS }
        );
        
        if (!holdersResponse.ok) {
            throw new Error(`Failed to fetch holders: ${holdersResponse.status}`);
        }

        const holdersData = await holdersResponse.json();
        const holders = holdersData.data || [];

        // Calculate metrics
        const devHolder = holders.find(h => h.user === holdersData.creator);
        const devBalance = devHolder ? Number(devHolder.balance) : 0;
        const totalSupply = Number(holdersData.total_supply);
        const devPercentage = (devBalance / totalSupply) * 100;

        const sortedHolders = [...holders].sort((a, b) => Number(b.balance) - Number(a.balance));
        const top5Balance = sortedHolders.slice(0, 5).reduce((sum, h) => sum + Number(h.balance), 0);
        const top5Percentage = (top5Balance / totalSupply) * 100;

        res.json({
            holders,
            metrics: {
                devPercentage,
                top5Percentage,
                holderCount: holders.length,
                devBalance,
                top5Balance
            }
        });
    } catch (error) {
        console.error('Error fetching holder metrics:', error);
        res.status(500).json({ error: 'Failed to fetch holder metrics' });
    }
});

// 3. Endpoint for token price updates
app.get('/api/token/:tokenId/price', async (req, res) => {
    try {
        const { tokenId } = req.params;
        
        // Fetch token data
        const response = await fetch(`https://api.odin.fun/v1/token/${tokenId}`, {
            headers: API_HEADERS
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch token: ${response.status}`);
        }

        const tokenData = await response.json();
        
        // Get BTC price
        const btcPriceResponse = await fetch('https://mempool.space/api/v1/prices');
        const btcPriceData = await btcPriceResponse.json();
        const btcUsdPrice = btcPriceData.USD;

        // Calculate price in USD
        const btcPrice = Number(tokenData.price) / 1e8;
        const usdPrice = btcPrice * btcUsdPrice;

        res.json({
            btcPrice,
            tokenPrice: btcPrice,
            usdPrice: usdPrice.toFixed(8)
        });
    } catch (error) {
        console.error('Error fetching token price:', error);
        res.status(500).json({ error: 'Failed to fetch token price' });
    }
});

// 4. Add rate limiting middleware
// ... existing code ...

// Add this new endpoint for creator tokens
app.get('/api/user/:userId/created', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Fetching created tokens for user: ${userId}`);

    // Check cache first
    const cacheKey = `user_created_${userId}`;
    const cachedData = await getCachedData(cacheKey, CACHE_DURATION);
    
    if (cachedData?.data) {
      console.log('Returning cached creator tokens');
      return res.json(cachedData.data);
    }

    // Fetch from Odin API
    const response = await fetch(`https://api.odin.fun/v1/user/${userId}/created`, {
      headers: {
        ...API_HEADERS,
        'User-Agent': getRandomUserAgent(),
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch creator tokens: ${response.status}`);
    }

    const data = await response.json();
    
    // Process the data to match expected format
    const processedData = {
      data: data.data || [],
      page: data.page || 1,
      limit: data.limit || 100,
      count: data.count || 0
    };

    // Cache the result
    await cacheData(cacheKey, processedData, CACHE_DURATION);

    console.log(`Found ${processedData.data.length} tokens created by ${userId}`);
    res.json(processedData);
  } catch (error) {
    console.error('Error fetching creator tokens:', error);
    // Return a valid response even on error
    res.json({
      data: [],
      page: 1,
      limit: 100,
      count: 0
    });
  }
});

// ... existing code ...

// Add this near the top after imports
const API_HEADERS = {
  'authority': 'api.odin.fun',
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.9',
  'origin': 'https://tools.humanz.fun',
  'referer': 'https://tools.humanz.fun/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};
