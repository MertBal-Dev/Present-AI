const axios = require('axios');

const imageCache = new Map();
const recentlyUsedImages = new Set();
const queryResultsMap = new Map();
const usedImagesInPresentation = new Set();

const {
  expandQueryWithAI,
  translateToEnglish,
  normalizeQuery
} = require('./aiService');


let GOOGLE_DISABLED = false;

function shouldUseGoogle() {
  if (GOOGLE_DISABLED) return false;
  if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX_ID) {
    console.warn('[Google] API keys missing');
    return false;
  }
  return true;
}



function smartQueryReducer(query) {
  if (!query) return '';

  let q = query.toLowerCase();


  const noisyWords = /\b(dslr camera|professional shot|taken with|captured by|wide angle lens)\b/gi;
  q = q.replace(noisyWords, '');

  q = q.replace(/[^\p{L}\p{N}\s'-]/gu, ' ');
  q = q.replace(/\s{2,}/g, ' ').trim();

  const words = q.split(' ');
  const filtered = words.filter(w => w.length > 1);


  const hasProperNouns = /[A-ZÇĞIÖŞÜ][a-zçğıöşü]+/.test(q);
  const maxWords = hasProperNouns ? 8 : 6;

  const final = filtered.slice(0, maxWords).join(' ').trim();

  console.log(`[SmartQuery] "${query}" → "${final}" (${hasProperNouns ? 'with names' : 'generic'})`);
  return final;
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


function adjustQueryForType(query) {
  let q = query.toLowerCase();

  const typeMap = [
    { match: /(harita|map|rota|gps)/, add: ' map top view satellite city layout' },
    { match: /(plan|mimari|architecture|çizim|design)/, add: ' architectural drawing blueprint floor plan' },
    { match: /(grafik|istatistik|chart|data|diagram)/, add: ' data visualization infographic statistical chart' },
    { match: /(doğa|nature|manzara|landscape)/, add: ' natural landscape wide shot real photo' },
    { match: /(bilim|science|teknoloji|laboratuvar)/, add: ' scientific equipment research lab technology scene' },
    { match: /(tarih|historical|antik|museum)/, add: ' historical artifact ancient ruins museum architecture' },
    { match: /(sanat|art|painting|heykel|resim)/, add: ' artwork painting gallery renaissance style' },
    { match: /(insan|human|toplum|sosyoloji)/, add: ' people group cultural daily life urban street' },
    { match: /(şehir|city|kent|urban)/, add: ' cityscape skyline architecture streets' },
    { match: /(doğu|islam|osmanlı|ottoman)/, add: ' historical ottoman architecture mosque old town' }
  ];

  for (const { match, add } of typeMap) {
    if (match.test(q)) query += ' ' + add;
  }

  if (query.split(' ').length > 20) {
    query = query.split(' ').slice(0, 20).join(' ');
  }

  return query;
}





async function validateImageQuality(url, minSize = 200000) {
  try {
    if (url.startsWith('x-raw-image://')) {
      return { valid: false, reason: 'Invalid URL format' };
    }

    const res = await axios.head(url, {
      timeout: 5000,
      maxRedirects: 3,
      validateStatus: (status) => status < 500
    });

    const contentType = res.headers['content-type'] || '';
    const contentLength = parseInt(res.headers['content-length'] || '0');


    if (!/image\/(jpeg|jpg|png|webp)/i.test(contentType)) {
      return { valid: false, reason: 'Invalid format' };
    }


    if (contentLength > 0 && contentLength < minSize) {
      console.log(`[Quality] ✗ Too small: ${Math.round(contentLength / 1024)}KB`);
      return { valid: false, reason: 'Low resolution' };
    }


    if (res.status >= 400) {
      return { valid: false, reason: `HTTP ${res.status}` };
    }

    console.log(`[Quality] ✓ Valid: ${Math.round(contentLength / 1024)}KB`);
    return { valid: true, size: contentLength };
  } catch (error) {
    return { valid: false, reason: error.message };
  }
}

async function searchGoogleImages(query, options = {}) {
  const {
    page = 1,
    resultsCount = 7,
    imageSize = 'large'
  } = options;

  if (!shouldUseGoogle()) {
    console.warn('[Google] Skipped (missing keys or temporarily disabled).');
    return [];
  }

  const cacheKey = `google:${query}:${page}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  try {
    const startIndex = (page - 1) * 10 + 1;
    console.log(`[Google] Searching (PSE mode): "${query}"`);


    const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_CX_ID,
        q: query,
        searchType: 'image',
        num: Math.min(resultsCount, 10),
        start: startIndex,
        imgSize: imageSize,
        safe: 'active'
      },
      timeout: 10000
    });

    const items = res.data?.items || [];
    const results = [];

    for (const item of items) {

      const imageUrl =
        item.pagemap?.cse_image?.[0]?.src ||
        item.pagemap?.cse_thumbnail?.[0]?.src ||
        item.link;

      if (!imageUrl) continue;


      const qualityCheck = await validateImageQuality(imageUrl, 100000);
      if (qualityCheck.valid) {
        results.push({
          url: imageUrl,
          title: item.title || 'Google PSE Image',
          source: 'google',
          width: item.image?.width || 0,
          height: item.image?.height || 0,
          fileSize: qualityCheck.size
        });
      }
    }

    console.log(`[Google] ✅ ${results.length}/${items.length} usable images (PSE mode)`);
    imageCache.set(cacheKey, results);
    return results;
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error(`[Google] Error (PSE): ${msg}`);

    if (typeof msg === 'string' && msg.toLowerCase().includes('quota')) {
      GOOGLE_DISABLED = true;
      console.warn('[Google] API quota exceeded – disabling temporarily');
    }
    return [];
  }
}




async function searchWikimediaImages(queries, options = {}) {
  const { resultsCount = 10 } = options;

  for (const query of queries) {
    const cleanQuery = normalizeQuery(query);
    const reduced = smartQueryReducer(cleanQuery);
    const cacheKey = `wiki:${reduced}`;

    if (imageCache.has(cacheKey)) {
      console.log(`[Wikimedia] Cache hit: "${reduced}"`);
      return imageCache.get(cacheKey);
    }

    try {
      console.log(`[Wikimedia] Searching: "${reduced}"`);


      const searchRes = await axios.get('https://commons.wikimedia.org/w/api.php', {
        params: {
          action: 'query',
          list: 'search',
          srsearch: `${reduced} filetype:bitmap`,
          srnamespace: 6,
          srlimit: 50,
          srinfo: '',
          srprop: 'size|wordcount|timestamp',
          format: 'json',
          origin: '*'
        },
        timeout: 10000
      });

      const searchResults = searchRes.data?.query?.search || [];

      if (searchResults.length === 0) {
        console.log(`[Wikimedia] No results for "${reduced}"`);
        continue;
      }

      console.log(`[Wikimedia] Found ${searchResults.length} potential files`);

      const titles = searchResults
        .slice(0, 30)
        .map(r => r.title)
        .join('|');

      const detailRes = await axios.get('https://commons.wikimedia.org/w/api.php', {
        params: {
          action: 'query',
          titles: titles,
          prop: 'imageinfo',
          iiprop: 'url|mime|size|extmetadata',
          iiurlwidth: 1920,
          format: 'json',
          origin: '*'
        },
        timeout: 10000
      });

      const pages = detailRes.data?.query?.pages || {};
      const results = [];

      for (const pageId in pages) {
        if (pageId === '-1') continue;

        const page = pages[pageId];
        const imageInfo = page?.imageinfo?.[0];

        if (!imageInfo?.url) continue;

        const mime = imageInfo.mime || '';
        if (!/image\/(jpeg|png|webp)/i.test(mime)) continue;

        const width = imageInfo.width || 0;
        const height = imageInfo.height || 0;


        if (width < 800 || height < 600) continue;

        const ratio = width / height;
        if (ratio < 0.5 || ratio > 3) continue;

        const pixels = width * height;

        results.push({
          url: imageInfo.url,
          title: page.title.replace('File:', '').replace(/_/g, ' '),
          source: 'wikimedia',
          width: width,
          height: height,
          mime: mime,
          pixels: pixels
        });

        if (results.length >= resultsCount * 2) break;
      }

      if (results.length > 0) {
        console.log(`[Wikimedia] ✓ Found ${results.length} images for "${query}"`);
        imageCache.set(cacheKey, results);
        return results;
      }

    } catch (err) {
      console.error(`[Wikimedia] Error for "${query}":`, err.message);
      continue;
    }
  }

  console.log('[Wikimedia] No valid images found for any query variation.');
  return [];
}


async function searchWikimediaByCategory(categoryName, options = {}) {
  const { resultsCount = 10 } = options;
  const cacheKey = `wiki-cat:${categoryName}`;


  if (imageCache.has(cacheKey)) {
    console.log(`[Wikimedia-Cat] Cache hit: "${categoryName}"`);
    return imageCache.get(cacheKey);
  }

  try {
    console.log(`[Wikimedia-Cat] Searching category: "Category:${categoryName}"`);


    const categoryRes = await axios.get('https://commons.wikimedia.org/w/api.php', {
      params: {
        action: 'query',
        list: 'categorymembers',
        cmtitle: `Category:${categoryName}`,
        cmtype: 'file',
        cmlimit: 30,
        format: 'json',
        origin: '*'
      },
      timeout: 10000
    });

    const members = categoryRes.data?.query?.categorymembers || [];

    if (members.length === 0) {
      console.log(`[Wikimedia-Cat] No files in category: "${categoryName}"`);
      return [];
    }

    console.log(`[Wikimedia-Cat] Found ${members.length} category members`);


    const titles = members
      .slice(0, 20)
      .map(m => m.title)
      .join('|');

    const detailRes = await axios.get('https://commons.wikimedia.org/w/api.php', {
      params: {
        action: 'query',
        titles: titles,
        prop: 'imageinfo',
        iiprop: 'url|mime|size',
        iiurlwidth: 1920,
        format: 'json',
        origin: '*'
      },
      timeout: 10000
    });

    const pages = detailRes.data?.query?.pages || {};
    const results = [];

    for (const pageId in pages) {
      if (pageId === '-1') continue;

      const page = pages[pageId];
      const imageInfo = page?.imageinfo?.[0];

      if (!imageInfo?.url) continue;

      const width = imageInfo.width || 0;
      const height = imageInfo.height || 0;

      if (width >= 800 && height >= 600) {
        const ratio = width / height;
        if (ratio >= 0.5 && ratio <= 3) {
          results.push({
            url: imageInfo.url,
            title: page.title.replace('File:', '').replace(/_/g, ' '),
            source: 'wikimedia-category',
            width: width,
            height: height
          });

          if (results.length >= resultsCount) break;
        }
      }
    }

    if (results.length > 0) {
      console.log(`[Wikimedia-Cat] ✓ Found ${results.length} images`);
      imageCache.set(cacheKey, results);
    }

    return results;

  } catch (err) {
    console.error(`[Wikimedia-Cat] Error:`, err.message);
    return [];
  }
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
          results.push({
            url: imageUrl,
            title: photo.alt || 'Pexels Photo',
            source: 'pexels',
            photographer: photo.photographer,
            width: photo.width,
            height: photo.height,
            pixels: photo.width * photo.height
          });
          if (results.length >= resultsCount) break;
        }
      }

      if (results.length > 0) {
        console.log(`[Pexels] ✓ Found ${results.length} images`);
        imageCache.set(cacheKey, results);
        return results;
      }
    } catch (err) {
      console.error(`[Pexels] Error: ${err.message}`);
      continue;
    }
  }

  console.log('[Pexels] No images found');
  return [];
}


function computeStringSimilarity(a, b) {
  if (!a || !b) return 0;
  const wordsA = a.toLowerCase().split(/\W+/).filter(Boolean);
  const wordsB = b.toLowerCase().split(/\W+/).filter(Boolean);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const common = wordsA.filter(w => wordsB.includes(w));
  const overlap = common.length / Math.max(wordsA.length, wordsB.length);
  return Math.sqrt(overlap);
}


function computeAspectBonus(img) {
  const ratio = (img.width || 1) / (img.height || 1);
  if (ratio > 1.6) return -0.1;
  if (ratio < 0.7) return -0.05;
  return 0.1;
}

function localRelevanceScore(query, img, context = '') {
  if (!query || !img) return 0;

  const titleScore = computeStringSimilarity(query, img.title || '');
  const urlScore = computeStringSimilarity(query, img.url || '');

  const fullText = (img.title + ' ' + img.url).toLowerCase();
  const q = query.toLowerCase();
  const ctx = context.toLowerCase();


  let contextScore = 0;
  if (ctx) {
    const contextWords = ctx.split(/\s+/).filter(w => w.length > 3);
    const matches = contextWords.filter(word => fullText.includes(word));
    contextScore = Math.min(0.4, matches.length * 0.1);
  }


  let semanticBoost = 0;
  const semanticPairs = [
    { kw: /(science|lab)/, match: /(bilim|laboratuvar)/ },
    { kw: /(map|satellite)/, match: /(harita|uydu)/ },
    { kw: /(ancient|obelisk|pillar)/, match: /(antik|dikilitaş|taş)/ },
    { kw: /(excavation|archaeologist)/, match: /(kazı|arkeolog)/ },
    { kw: /(sunset|sunrise)/, match: /(gün batımı|gün doğumu)/ },
    { kw: /(protective roof|cover)/, match: /(koruyucu çatı)/ },
    { kw: /(drone|aerial)/, match: /(drone|havadan)/ },
    { kw: /(fox|animal relief)/, match: /(tilki|hayvan kabartma)/ }
  ];

  for (const { kw, match } of semanticPairs) {
    if (kw.test(fullText) && match.test(q)) {
      semanticBoost += 0.25;
    }
  }


  const negativeKeywords = [
    /(wedding|bride|fashion|model|food|laptop|beach|vacation|white house)/i
  ];
  let negativePenalty = 0;
  for (const pattern of negativeKeywords) {
    if (pattern.test(fullText)) {
      negativePenalty += 0.5;
    }
  }


  let exactMatchBonus = 0;
  const queryWords = q.split(/\s+/).filter(w => w.length > 3);
  for (const word of queryWords) {
    if (fullText.includes(word)) exactMatchBonus += 0.15;
  }

  const properNouns = query.match(/[A-ZÇĞİÖŞÜ][a-zçğıöşü]+/g) || [];
  for (const name of properNouns) {
    if (fullText.includes(name.toLowerCase())) {
      exactMatchBonus += 0.20;
    }
  }


  let qualityBonus = 0;
  if (img.pixels) {
    if (img.pixels > 4000000) qualityBonus += 0.08;
    else if (img.pixels < 1000000) qualityBonus -= 0.10;
  }


  const base = (titleScore * 0.5 + urlScore * 0.2 + contextScore * 0.3)
    + semanticBoost + exactMatchBonus + qualityBonus - negativePenalty;
  return Math.max(0, Math.min(base, 1));
}






async function smartImageSearch(queryInput) {
  let query, queryEnglish, queryContext;

  if (typeof queryInput === 'string') {
    query = queryInput;
    queryEnglish = null;
    queryContext = '';
  } else if (typeof queryInput === 'object' && queryInput !== null) {
    if (queryInput.imageKeywords) {
      query = queryInput.imageKeywords.query || queryInput.query || '';
      queryEnglish = queryInput.imageKeywords.queryEnglish || null;
      queryContext = queryInput.imageKeywords.context || queryInput.context || '';
    } else {
      query = queryInput.query || '';
      queryEnglish = null;
      queryContext = queryInput.context || '';
    }
  } else {
    query = '';
    queryEnglish = null;
    queryContext = '';
  }

  if (!query.trim()) {
    console.warn('[SmartSearch] Empty query provided');
    return null;
  }

  const normalized = normalizeQuery(query);
  console.log(`[SmartSearch] Starting search for: "${normalized}"`);

  const adjusted = adjustQueryForType(normalized);
  const reduced = smartQueryReducer(adjusted);


  if (queryResultsMap.has(reduced)) {
    const stored = queryResultsMap.get(reduced);
    while (stored.current < stored.all.length) {
      const nextImg = stored.all[stored.current++];
      if (!usedImagesInPresentation.has(nextImg.url)) {
        usedImagesInPresentation.add(nextImg.url);
        console.log(`[SmartSearch] 🔁 Cached (${stored.current}/${stored.all.length}) - Unique image`);
        return { imageUrl: nextImg.url, source: nextImg.source, score: nextImg.score || null };
      } else {
        console.log(`[SmartSearch] ⚠️ Skipping duplicate image`);
      }
    }
    console.log(`[SmartSearch] All cached images used, performing new search...`);
    queryResultsMap.delete(reduced);
  }

  try {
    const turkishQuery = reduced;
    const isTurkish = /[çğıöşü]/i.test(turkishQuery);
    let englishQuery = queryEnglish;


    console.log(`[SmartSearch] 🔍 Phase 1: Wikimedia search (Turkish first, no AI)...`);
    let wikimediaResults = [];


    if (isTurkish) {
      wikimediaResults = await searchWikimediaImages([turkishQuery]);
      console.log(`[SmartSearch] Turkish search: ${wikimediaResults.length} results`);
    } else {
      wikimediaResults = await searchWikimediaImages([englishQuery || turkishQuery]);
      console.log(`[SmartSearch] English search: ${wikimediaResults.length} results`);
    }


    const queryForNouns = englishQuery || turkishQuery || '';
    const properNouns = queryForNouns.match(/\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)?\b/g);

    if (properNouns) {
      const fullName = properNouns.join(' ').trim();
      const placeName = properNouns[properNouns.length - 1];
      const cat1 = await searchWikimediaByCategory(fullName);
      const cat2 = await searchWikimediaByCategory(placeName);
      wikimediaResults.push(...cat1, ...cat2);
    }

    console.log(`[SmartSearch] Phase 1 results: ${wikimediaResults.length} from Wikimedia`);


    let bestWikimediaScore = 0;
    let bestWikimediaImage = null;
    const WIKIMEDIA_QUALITY_THRESHOLD = 0.70;
    const WIKIMEDIA_MINIMUM_RESULTS = 3;

    if (wikimediaResults.length > 0) {
      for (const img of wikimediaResults) {
        let score = isTurkish
          ? localRelevanceScore(turkishQuery, img, queryContext)
          : localRelevanceScore(englishQuery || turkishQuery, img, queryContext);

        if (img.source === 'wikimedia-category') score += 0.25;
        if (img.width && img.height) {
          const pixels = img.width * img.height;
          if (pixels > 4000000) score += 0.10;
        }
        img.score = score;
        if (score > bestWikimediaScore) {
          bestWikimediaScore = score;
          bestWikimediaImage = img;
        }
      }

      const scorePercent = Math.round(bestWikimediaScore * 100);
      console.log(`[SmartSearch] Best Wikimedia score: ${scorePercent}%`);

      if (bestWikimediaScore >= WIKIMEDIA_QUALITY_THRESHOLD) {
        const sorted = wikimediaResults.filter(i => i.score).sort((a, b) => b.score - a.score).slice(0, 10);
        queryResultsMap.set(reduced, { all: sorted, current: 1 });
        usedImagesInPresentation.add(bestWikimediaImage.url);
        return {
          imageUrl: bestWikimediaImage.url,
          source: bestWikimediaImage.source,
          score: bestWikimediaImage.score,
          title: bestWikimediaImage.title
        };
      }
    }


    if (isTurkish && wikimediaResults.length < WIKIMEDIA_MINIMUM_RESULTS) {
      console.log(`[SmartSearch] ⚠️ Turkish insufficient (${wikimediaResults.length} results) → trying English...`);


      if (!englishQuery) {
        englishQuery = await translateToEnglish(reduced);
        console.log(`[SmartSearch] Translation: "${reduced}" → "${englishQuery}"`);
      }


      const englishWikimediaResults = await searchWikimediaImages([englishQuery]);
      console.log(`[SmartSearch] English search: ${englishWikimediaResults.length} results`);


      wikimediaResults.push(...englishWikimediaResults);


      const englishProperNouns = englishQuery.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g);
      if (englishProperNouns) {
        const fullName = englishProperNouns.join(' ').trim();
        const placeName = englishProperNouns[englishProperNouns.length - 1];
        const cat1 = await searchWikimediaByCategory(fullName);
        const cat2 = await searchWikimediaByCategory(placeName);
        wikimediaResults.push(...cat1, ...cat2);
      }

      console.log(`[SmartSearch] Combined results after English: ${wikimediaResults.length}`);


      if (wikimediaResults.length > 0) {
        for (const img of wikimediaResults) {
          if (img.score) continue;

          let score = localRelevanceScore(englishQuery, img, queryContext);
          if (img.source === 'wikimedia-category') score += 0.25;
          if (img.width && img.height) {
            const pixels = img.width * img.height;
            if (pixels > 4000000) score += 0.10;
          }
          img.score = score;
          if (score > bestWikimediaScore) {
            bestWikimediaScore = score;
            bestWikimediaImage = img;
          }
        }

        const scorePercent = Math.round(bestWikimediaScore * 100);
        console.log(`[SmartSearch] Best score after English: ${scorePercent}%`);

        if (bestWikimediaScore >= WIKIMEDIA_QUALITY_THRESHOLD) {
          const sorted = wikimediaResults.filter(i => i.score).sort((a, b) => b.score - a.score).slice(0, 10);
          queryResultsMap.set(reduced, { all: sorted, current: 1 });
          usedImagesInPresentation.add(bestWikimediaImage.url);
          return {
            imageUrl: bestWikimediaImage.url,
            source: bestWikimediaImage.source,
            score: bestWikimediaImage.score,
            title: bestWikimediaImage.title
          };
        }
      }
    }


    console.log(`[SmartSearch] ⚠️ Wikimedia still insufficient → activating AI expansion...`);


    if (!englishQuery && isTurkish) {
      englishQuery = await translateToEnglish(reduced);
      console.log(`[SmartSearch] Translation: "${reduced}" → "${englishQuery}"`);
    }


    let aiVariants = [];
    if (wikimediaResults.length < WIKIMEDIA_MINIMUM_RESULTS || bestWikimediaScore < 0.50) {
      try {
        aiVariants = await expandQueryWithAI(englishQuery || reduced, queryContext);
        console.log(`[SmartSearch] AI Expansion: [${aiVariants.join(', ')}]`);
      } catch (err) {
        console.warn(`[SmartSearch] AI expansion skipped: ${err.message}`);
      }
    } else {
      console.log(`[SmartSearch] ⏭️ AI expansion skipped (Wikimedia sufficient)`);
    }


    const allQueries = [englishQuery || reduced, ...aiVariants].filter(Boolean);
    const uniqueQueries = Array.from(new Set(allQueries));


    const wikimediaPromises = uniqueQueries.map(q => searchWikimediaImages([q]));

    if (properNouns) {
      const fullName = properNouns.join(' ').trim();
      const placeName = properNouns[properNouns.length - 1];
      wikimediaPromises.push(
        searchWikimediaByCategory(fullName),
        searchWikimediaByCategory(placeName)
      );
    }

    const wikimediaSettled = await Promise.allSettled(wikimediaPromises);
    let finalWikimediaResults = [];
    for (const result of wikimediaSettled) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        finalWikimediaResults.push(...result.value);
      }
    }


    let googleResults = [];
    if (shouldUseGoogle() && finalWikimediaResults.length < 3) {
      console.log(`[SmartSearch] 🔍 Phase 2: Google search (fallback)...`);

      const googlePromises = [];


      if (isTurkish) {
        console.log(`[Google] Trying Turkish query: "${turkishQuery}"`);
        googlePromises.push(searchGoogleImages(turkishQuery, { resultsCount: 5 }));
      }


      const googleQueryEnglish = englishQuery || reduced;
      if (googleQueryEnglish !== turkishQuery) {
        console.log(`[Google] Adding English query: "${googleQueryEnglish}"`);
        googlePromises.push(searchGoogleImages(googleQueryEnglish, { resultsCount: 5 }));
      }


      const googleSettled = await Promise.allSettled(googlePromises);
      for (const result of googleSettled) {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          googleResults.push(...result.value);
        }
      }

      console.log(`[Google] ✅ Found ${googleResults.length} images (from ${googlePromises.length} queries)`);
    } else {
      console.log(`[Google] ⏭️ Skipped (sufficient Wikimedia results)`);
    }


    let pexelsResults = [];
    try {
      const pexelsQuery = englishQuery || reduced;
      if (pexelsQuery && pexelsQuery.trim()) {
        console.log(`[SmartSearch] 🔍 Phase 3: Pexels search...`);

        const pexelsPromises = [
          searchPexelsImages([pexelsQuery]),
          ...(aiVariants.length > 0 ? [searchPexelsImages([aiVariants[0]])] : [])
        ];

        const pexelsSettled = await Promise.allSettled(pexelsPromises);
        for (const result of pexelsSettled) {
          if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            pexelsResults.push(...result.value);
          }
        }

        console.log(`[Pexels] ✅ Found ${pexelsResults.length} images`);
      } else {
        console.warn(`[Pexels] Skipped: No English query available`);
      }
    } catch (err) {
      console.warn(`[SmartSearch] Pexels failed: ${err.message}`);
    }

    const allResults = [...finalWikimediaResults, ...googleResults, ...pexelsResults];
    if (!allResults.length) {
      console.warn(`[SmartSearch] ✗ No results found from any source`);
      return null;
    }

    console.log(`[SmartSearch] Total results: ${allResults.length} (Wikimedia: ${finalWikimediaResults.length}, Google: ${googleResults.length}, Pexels: ${pexelsResults.length})`);


    const scoredResults = [];
    for (const img of allResults) {
      if (img.score) {
        scoredResults.push(img);
        continue;
      }

      let score = localRelevanceScore(englishQuery || turkishQuery, img, queryContext);


      if (img.source === 'google') score += 0.35;
      else if (img.source === 'pexels') score += 0.30;
      else if (img.source === 'wikimedia-category') score += 0.28;
      else if (img.source === 'wikimedia') score += 0.25;


      if (img.width && img.height) {
        const pixels = img.width * img.height;
        if (pixels > 4000000) score += 0.10;
        else if (pixels > 2000000) score += 0.05;
      }


      if (isTurkish && img.url) {
        const url = img.url.toLowerCase();


        if (url.includes('.tr') || url.includes('turkey') || url.includes('turkiye')) {
          score += 0.15;
        }


        if (img.source === 'google' && img.searchLang === 'Turkish') {
          score += 0.10;
        }
      }

      img.score = score;
      scoredResults.push(img);
    }


    const sorted = scoredResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    const diversified = [];
    const usedUrls = new Set();
    const sourceCount = {};

    for (const img of sorted) {
      if (usedUrls.has(img.url) || usedImagesInPresentation.has(img.url)) continue;

      const source = img.source;
      sourceCount[source] = (sourceCount[source] || 0) + 1;
      if (sourceCount[source] > 5) continue;

      diversified.push(img);
      usedUrls.add(img.url);
      if (diversified.length >= 10) break;
    }

    const best = diversified[0] || sorted[0];
    if (!best) {
      console.warn(`[SmartSearch] ✗ No unique images available`);
      return null;
    }

    queryResultsMap.set(reduced, { all: diversified, current: 1 });
    usedImagesInPresentation.add(best.url);

    const scorePercent = Math.round((best.score || 0) * 100);
    console.log(`[SmartSearch] ✅ Final best: ${best.source} (${scorePercent}%)`);
    console.log(`[SmartSearch] Image: ${best.title?.substring(0, 60)}...`);
    console.log(`[SmartSearch] 📊 Total unique images used: ${usedImagesInPresentation.size}`);

    if (googleResults.length > 0) {
      console.log(`[SmartSearch] 💰 Google API used: 1 request for this slide`);
    } else {
      console.log(`[SmartSearch] 💰 Google API saved: 0 requests used`);
    }

    return {
      imageUrl: best.url,
      source: best.source,
      score: best.score,
      title: best.title
    };

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


function resetPresentationImages() {
  usedImagesInPresentation.clear();
  console.log('[ImageService] 🔄 Presentation image history reset');
}


function getUsedImagesCount() {
  return usedImagesInPresentation.size;
}


function isImageUsed(imageUrl) {
  return usedImagesInPresentation.has(imageUrl);
}

module.exports = {
  smartImageSearch,
  searchWikimediaImages,
  searchWikimediaByCategory,
  searchGoogleImages,
  searchPexelsImages,
  validateImageQuality,
  clearRecentlyUsed,
  clearCacheForQuery,
  resetPresentationImages,
  getUsedImagesCount,
  isImageUsed
};