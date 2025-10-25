const axios = require('axios');

const imageCache = new Map();
const recentlyUsedImages = new Set();
const queryResultsMap = new Map();


function simplifyQuery(query) {
  
  const keywords = ['spacex', 'falcon 9', 'starship', 'nasa', 'rocket', 'uydu', 'roket'];
  const queryParts = query.toLowerCase().split(' ');
  
  
  let simpleParts = queryParts.filter(part => keywords.includes(part) || part.length > 3);
  
  if (simpleParts.length > 3) {
    simpleParts = simpleParts.slice(0, 3); 
  }
  
  const simplified = simpleParts.join(' ');
  return simplified.length > 0 ? simplified : queryParts.slice(0, 2).join(' '); 
}


function diversifyQuery(query, searchEngine = 'wikimedia') {
  const clean = query.trim();
  switch (searchEngine) {
    case 'google':
      return `${clean} photo`;
    case 'wikimedia':
    case 'pexels':
    default:
      return clean;
  }
}

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

async function searchGoogleImages(query, options = {}) {
    const { 
    page = 1,
    resultsCount = 10,
    imageType = 'photo',
    imageSize = 'large'
  } = options;
  
  if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX_ID) {
    console.warn('[Google] API keys missing');
    return [];
  }
  const cacheKey = `google:${query}:${page}:${imageType}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);
  try {
    const startIndex = (page - 1) * 10 + 1;
    const optimizedQuery = diversifyQuery(query, 'google');
    console.log(`[Google] Searching: "${optimizedQuery}" (Type: ${imageType})`);
    const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_CX_ID,
        q: optimizedQuery,
        searchType: 'image',
        num: Math.min(resultsCount, 10),
        start: startIndex,
        imgSize: imageSize,
        imgType: imageType,
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


async function searchWikimediaImages(queries, options = {}) {
  const { resultsCount = 10 } = options;
  
  for (const query of queries) {
    const cacheKey = `wiki:${query}`;
    if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

    try {
      console.log(`[Wikimedia] Searching: "${query}"`);
      const searchUrl = `https://commons.wikimedia.org/w/api.php`;
      const searchRes = await axios.get(searchUrl, {
        params: {
          action: 'query',
          generator: 'search',
          gsrsearch: query,
          gsrlimit: 20,
          gsrnamespace: 6, 
          prop: 'imageinfo',
          iiprop: 'url|mime|size',
          format: 'json',
          origin: '*'
        },
        timeout: 10000
      });

      const pages = searchRes.data?.query?.pages;
      if (!pages) continue;

      const results = [];
      for (const pageId in pages) {
        const imageInfo = pages[pageId]?.imageinfo?.[0];
        if (!imageInfo?.url) continue;

        const mime = imageInfo.mime || '';
        const width = imageInfo.width || 0;
        const height = imageInfo.height || 0;

        if (!/image\/(jpeg|png|webp)/i.test(mime)) continue;
        if (width < 800 || height < 600) continue;

        if (await validateImageQuality(imageInfo.url)) {
          results.push({
            url: imageInfo.url,
            title: pages[pageId].title,
            source: 'wikimedia',
          });
          if (results.length >= resultsCount) break;
        }
      }

      if (results.length > 0) {
        console.log(`[Wikimedia] Found ${results.length} valid images for "${query}"`);
        imageCache.set(cacheKey, results);
        return results;
      }
    } catch (err) {
      console.error(`[Wikimedia] Error for "${query}": ${err.message}`);
      continue;
    }
  }
  console.log('[Wikimedia] No pages found for any query variation.');
  return [];
}



async function searchPexelsImages(queries, options = {}) {
  const { resultsCount = 5 } = options;
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  for (const query of queries) {
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

      if (results.length > 0) {
        console.log(`[Pexels] Found ${results.length} valid images for "${query}"`);
        imageCache.set(cacheKey, results);
        return results;
      }
    } catch (err) {
      console.error(`[Pexels] Error for "${query}": ${err.message}`);
      continue;
    }
  }
  console.log('[Pexels] No images found for any query variation.');
  return [];
}


async function smartImageSearch(queryData) {
  const query = typeof queryData === 'string' ? queryData : queryData.query;
  const queryEnglish = queryData?.queryEnglish || query;
  console.log(`[SmartSearch] Starting: "${query}"`);
  const originalQuery = queryData?.query || query;

  if (queryResultsMap.has(originalQuery)) {
    const storedResults = queryResultsMap.get(originalQuery);
    console.log(`[SmartSearch] 🔄 Using cached results pool (${storedResults.current + 1}/${storedResults.all.length})`);
    const nextImage = storedResults.all[storedResults.current];
    storedResults.current = (storedResults.current + 1) % storedResults.all.length;
    console.log(`[SmartSearch] ✓ Returning image ${storedResults.current}/${storedResults.all.length} from ${nextImage.source}`);
    return nextImage.url;
  }

  try {
    let allResults = [];

    
    const queryVariations = [query, simplifyQuery(query)];
    const queryVariationsEnglish = [queryEnglish, simplifyQuery(queryEnglish)];

    
    const wikimediaResults = await searchWikimediaImages(queryVariations);
    if (wikimediaResults.length > 0) {
        allResults = allResults.concat(wikimediaResults);
    }

    
    let googleOptions = { resultsCount: 10 };
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('logo') || lowerQuery.includes('amblem')) {
      googleOptions.imageType = 'clipart';
    } else if (lowerQuery.includes('grafik') || lowerQuery.includes('diyagram') || lowerQuery.includes('harita')) {
      googleOptions.imageType = 'lineart';
    }
    for (const q of [query, queryEnglish]) {
        const results = await searchGoogleImages(q, googleOptions);
        if (results.length > 0) {
            allResults = allResults.concat(results);
        }
    }

    
    const pexelsResults = await searchPexelsImages(queryVariationsEnglish);
    if (pexelsResults.length > 0) {
        allResults = allResults.concat(pexelsResults);
    }
    
    if (allResults.length === 0) {
      console.warn(`[SmartSearch] ✗ No images found for "${query}"`);
      return null;
    }

    const shuffledResults = allResults.sort(() => Math.random() - 0.5);
    const selectedImage = shuffledResults[0];

    queryResultsMap.set(originalQuery, {
      all: shuffledResults,
      current: 1
    });

    console.log(`[SmartSearch] ✓ Found ${shuffledResults.length} images, cached for rotation`);
    console.log(`[SmartSearch] ✓ Selected first image from ${selectedImage.source}`);
    return selectedImage.url;

  } catch (error) {
    console.error(`[SmartSearch] Fatal error:`, error.message);
    return null;
  }
}

function clearCacheForQuery(query) {
  if (queryResultsMap.has(query)) {
    console.log(`[ImageService] 🗑️ Cleared rotation cache for: "${query}"`);
    queryResultsMap.delete(query);
    return true;
  }
  return false;
}

function clearRecentlyUsed() {
  recentlyUsedImages.clear();
  queryResultsMap.clear();
  console.log('[ImageService] Recently used images and rotation cache cleared');
}

module.exports = {
  smartImageSearch,
  searchWikimediaImages,
  searchGoogleImages,
  searchPexelsImages,
  validateImageQuality,
  clearRecentlyUsed,
  clearCacheForQuery
};