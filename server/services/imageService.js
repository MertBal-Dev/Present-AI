const axios = require('axios');

const imageCache = new Map();

/* ===================== BASIT QUERY OPTIMIZATION ===================== */

/**
 * AI olmadan basit query iyileştirme
 */
function enhanceSearchQuery(originalQuery) {
  const words = originalQuery.trim().split(/\s+/);
  
  return {
    primary: originalQuery,
    fallback: words.length > 3 ? words.slice(0, -1).join(' ') : originalQuery,
    generic: words.length > 2 ? words.slice(0, 2).join(' ') : originalQuery,
    english: originalQuery 
  };
}

function diversifyQuery(query, searchEngine = 'wikimedia') {
  const clean = query.trim();
  
  switch (searchEngine) {
    case 'google':
      return `${clean} photo`;
    case 'wikimedia':
      return clean;
    case 'pexels':
      return clean;
    default:
      return clean;
  }
}

/* ===================== IMAGE QUALITY VALIDATION ===================== */

async function validateImageQuality(url, minSize = 100000) {
  try {
    
    if (url.startsWith('x-raw-image://')) {
      return false;
    }
    
    const res = await axios.head(url, { 
      timeout: 5000,
      maxRedirects: 3,
      validateStatus: (status) => status < 500
    });
    
    const contentType = res.headers['content-type'] || '';
    const contentLength = parseInt(res.headers['content-length'] || '0');
    
    if (!/image\/(jpeg|jpg|png|webp)/i.test(contentType)) {
      return false;
    }
    
    if (contentLength > 0 && contentLength < minSize) {
      return false;
    }
    
    if (res.status >= 400) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/* ===================== SEARCH ENGINES ===================== */

/**
 * Google Custom Search
 */
async function searchGoogleImages(query, options = {}) {
  const { page = 1, resultsCount = 5 } = options;
  
  if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX_ID) {
    console.warn('[Google] API keys missing');
    return [];
  }

  const cacheKey = `google:${query}:${page}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  try {
    const startIndex = (page - 1) * 10 + 1;
    const optimizedQuery = diversifyQuery(query, 'google');
    
    console.log(`[Google] Searching: "${optimizedQuery}"`);
    
    const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_CX_ID,
        q: optimizedQuery,
        searchType: 'image',
        num: Math.min(resultsCount, 10),
        start: startIndex,
        imgSize: 'large',
        imgType: 'photo',
        safe: 'active',
        fileType: 'jpg,png'
      },
      timeout: 10000
    });

    const items = res.data.items || [];
    const results = [];
    
    for (const item of items) {
      const imageUrl = item?.link;
      
      
      if (!imageUrl || imageUrl.startsWith('x-raw-image://')) {
        continue;
      }
      
      if (await validateImageQuality(imageUrl, 80000)) {
        results.push({
          url: imageUrl,
          title: item.title,
          source: 'google'
        });
      }
    }
    
    console.log(`[Google] Found ${results.length} valid images`);
    imageCache.set(cacheKey, results);
    return results;

  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error(`[Google] Error: ${msg}`);
    return [];
  }
}

/**
 * Wikimedia Commons
 */
async function searchWikimediaImages(query, options = {}) {
  const { resultsCount = 10 } = options;
  const cacheKey = `wiki:${query}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  try {
    console.log(`[Wikimedia] Searching: "${query}"`);
    
    const searchUrl = `https://commons.wikimedia.org/w/rest.php/v1/search/page`;
    const searchRes = await axios.get(searchUrl, {
      params: {
        q: query,
        limit: 30
      },
      timeout: 10000
    });
    
    const pages = searchRes.data?.pages || [];
    if (!pages.length) {
      console.log('[Wikimedia] No pages found');
      return [];
    }

    const results = [];
    
    for (const page of pages.slice(0, resultsCount * 2)) {
      try {
        const title = page.title.startsWith('File:') ? page.title : `File:${page.title}`;
        
        const infoUrl = `https://commons.wikimedia.org/w/api.php`;
        const infoRes = await axios.get(infoUrl, {
          params: {
            action: 'query',
            titles: title,
            prop: 'imageinfo',
            iiprop: 'url|mime|size',
            format: 'json',
            origin: '*'
          },
          timeout: 8000
        });
        
        const pageData = Object.values(infoRes.data.query.pages || {})[0];
        const imageInfo = pageData?.imageinfo?.[0];
        
        if (!imageInfo?.url) continue;
        
        const mime = imageInfo.mime || '';
        const width = imageInfo.width || 0;
        const height = imageInfo.height || 0;
        
        if (!/image\/(jpeg|png|webp)/i.test(mime)) continue;
        if (width < 800 || height < 600) continue;
        
        if (await validateImageQuality(imageInfo.url)) {
          results.push({
            url: imageInfo.url,
            title: page.title,
            source: 'wikimedia',
            width: width,
            height: height
          });
          
          if (results.length >= resultsCount) break;
        }
      } catch (itemError) {
        continue;
      }
    }
    
    console.log(`[Wikimedia] Found ${results.length} valid images`);
    imageCache.set(cacheKey, results);
    return results;

  } catch (err) {
    console.error(`[Wikimedia] Error: ${err.message}`);
    return [];
  }
}

/**
 * Pexels API
 */
async function searchPexelsImages(query, options = {}) {
  const { resultsCount = 5 } = options;
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  const cacheKey = `pexels:${query}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  try {
    console.log(`[Pexels] Searching: "${query}"`);
    
    const res = await axios.get(`https://api.pexels.com/v1/search`, {
      headers: { Authorization: apiKey },
      params: { 
        query: query, 
        per_page: resultsCount * 2,
        orientation: 'landscape',
        size: 'large'
      },
      timeout: 10000
    });

    const photos = res.data?.photos || [];
    const results = [];
    
    for (const photo of photos) {
      const imageUrl = photo?.src?.large2x || photo?.src?.large;
      if (imageUrl && photo.width >= 1920 && photo.height >= 1080) {
        if (await validateImageQuality(imageUrl)) {
          results.push({
            url: imageUrl,
            title: photo.alt || 'Pexels Photo',
            source: 'pexels',
            photographer: photo.photographer
          });
          
          if (results.length >= resultsCount) break;
        }
      }
    }
    
    console.log(`[Pexels] Found ${results.length} valid images`);
    imageCache.set(cacheKey, results);
    return results;

  } catch (err) {
    console.error(`[Pexels] Error: ${err.message}`);
    return [];
  }
}

/* ===================== SMART IMAGE SEARCH ===================== */

async function smartImageSearch(queryData) {
  const query = typeof queryData === 'string' ? queryData : queryData.query;
  const queryEnglish = queryData?.queryEnglish || query;
  
  console.log(`\n[SmartSearch] Starting: "${query}"`);
  
  const cacheKey = `smart:${query}`;
  if (imageCache.has(cacheKey)) {
    console.log('[SmartSearch] Cache hit');
    return imageCache.get(cacheKey);
  }

  try {
    
    const enhanced = enhanceSearchQuery(query);
    const searchQueries = [
      enhanced.primary,
      enhanced.fallback,
      enhanced.generic
    ];

    
    for (const q of searchQueries) {
      const results = await searchWikimediaImages(q, { resultsCount: 3 });
      if (results.length > 0) {
        console.log(`[SmartSearch] ✓ Found on Wikimedia: ${results[0].url}`);
        imageCache.set(cacheKey, results[0].url);
        return results[0].url;
      }
    }

    
    if (shouldUseGoogle(query)) {
      for (const q of [searchQueries[0], queryEnglish]) {
        const results = await searchGoogleImages(q, { resultsCount: 3 });
        if (results.length > 0) {
          console.log(`[SmartSearch] ✓ Found on Google: ${results[0].url}`);
          imageCache.set(cacheKey, results[0].url);
          return results[0].url;
        }
      }
    }

    
    const pexelsResults = await searchPexelsImages(queryEnglish, { resultsCount: 3 });
    if (pexelsResults.length > 0) {
      console.log(`[SmartSearch] ✓ Found on Pexels: ${pexelsResults[0].url}`);
      imageCache.set(cacheKey, pexelsResults[0].url);
      return pexelsResults[0].url;
    }

    console.warn(`[SmartSearch] ✗ No images found for "${query}"`);
    return null;

  } catch (error) {
    console.error(`[SmartSearch] Fatal error:`, error.message);
    return null;
  }
}

function shouldUseGoogle(query) {
  const importantKeywords = [
    'tarih', 'tarihi', 'historical',
    'mimari', 'architecture',
    'bilim', 'science',
    'müze', 'museum',
    'antik', 'ancient'
  ];
  
  const lowerQuery = query.toLowerCase();
  return importantKeywords.some(kw => lowerQuery.includes(kw)) || Math.random() < 0.3;
}

module.exports = {
  smartImageSearch,
  searchWikimediaImages,
  searchGoogleImages,
  searchPexelsImages,
  validateImageQuality
};