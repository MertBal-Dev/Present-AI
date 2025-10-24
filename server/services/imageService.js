const axios = require('axios');


const imageCache = {};

function diversifyQuery(original) {
  const base = original.trim();
  const variants = [
    base,
    `${base} photo`,
    `${base} hd image`,
    `${base} realistic`,
    `${base} landscape`,
    `${base} scene`,
    `${base} high quality`,
    `${base} wallpaper`
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

function buildSimplifiedQueries(original) {
  const q = String((original || '').trim()).replace(/\s+/g, ' ');
  if (!q) return [];
  const list = [q];
  const words = q.split(' ');
  if (words.length >= 3) {
    list.push(words.slice(0, Math.max(2, words.length - 2)).join(' '));
  }
  if (words.length >= 2) {
    list.push(words.slice(0, 2).join(' '));
  }
  return Array.from(new Set(list.map(s => s.trim()).filter(Boolean)));
}

async function searchGoogleImages(query, page = 1, nonce = '') {
  query = diversifyQuery(query); 
  if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX_ID) {
    console.log('Google API anahtarları yapılandırılmamamış, bu kaynak atlanıyor.');
    return null;
  }

  const cacheKey = `google:${query}:${page}:${nonce}`;
  if (!nonce && imageCache[cacheKey]) {
    return imageCache[cacheKey];
  }

  try {
    const startIndex = (page - 1) * 1 + 1;
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_CX_ID,
        q: query,
        searchType: 'image',
        num: 1,
        start: startIndex,
        imgSize: 'large',
        imgType: 'photo',
        fileType: 'jpg,png',
        safe: 'active',
        rights: 'cc_publicdomain,cc_attribute,cc_sharealike',
        _t: Date.now() 
      }
    });
    if (response.data.items && response.data.items.length > 0) {
      const imageUrl = response.data.items[0].link;
      if (await validateImageQuality(imageUrl)) { 
        imageCache[cacheKey] = imageUrl;
        return imageUrl;
      }
    }
    return null;
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error(`Google Görsel Arama hatası (${query}):`, errorMessage);
    if (errorMessage.includes('Quota exceeded')) {
      throw new Error('Google Quota Exceeded');
    }
    return null;
  }
}

async function searchWikimediaImages(query, nonce = '') {
  query = diversifyQuery(query); 
  const cacheKey = `wikimedia:${query}:${nonce}`;
  if (!nonce && imageCache[cacheKey]) return imageCache[cacheKey];

  try {
    console.log(`[Wikimedia AI] "${query}" için gelişmiş akıllı arama başlatılıyor...`);

    
    const searchUrl = `https://commons.wikimedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=30&_=${Date.now()}`;
    const searchRes = await axios.get(searchUrl, { timeout: 10000 });
    const pages = searchRes.data?.pages || [];

    if (pages.length === 0) {
      console.warn(`[Wikimedia AI] "${query}" için sonuç bulunamadı.`);
      return null;
    }

    const imageCandidates = [];

    for (const p of pages.slice(0, 20)) {
      const title = p.title.toLowerCase().startsWith('file:') ? p.title : `File:${p.title}`;

      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo|pageterms|info&iiprop=url|mime|size|extmetadata&format=json&origin=*`;
      const infoRes = await axios.get(infoUrl, { timeout: 10000 });

      const pageData = Object.values(infoRes.data.query?.pages || {})[0];
      const infos = pageData?.imageinfo || [];
      const desc = pageData?.terms?.description?.[0] || '';

      for (const img of infos) {
        if (!img.url || !img.mime?.startsWith('image/')) continue;
        const width = img.width || img.extmetadata?.ImageWidth?.value || 0;
        const height = img.height || img.extmetadata?.ImageHeight?.value || 0;
        const ratio = width / (height || 1);
        const descText = (desc + ' ' + (img.extmetadata?.ImageDescription?.value || '')).toLowerCase();

        if (width < 1000 || height < 700) continue;
        if (ratio < 0.7 || ratio > 2.2) continue;

        const keywords = query.toLowerCase().split(/\s+/);
        const matchScore = keywords.reduce((s, k) => s + (descText.includes(k) ? 1 : 0), 0);

        imageCandidates.push({
          url: img.url,
          width,
          height,
          mime: img.mime,
          ratio,
          desc: descText,
          score: matchScore + (width * height) / 1000000,
        });
      }
    }

    if (imageCandidates.length === 0) return null;

    imageCandidates.sort((a, b) => b.score - a.score);
    const top = imageCandidates.slice(0, 3);
    const selected = top[Math.floor(Math.random() * top.length)];

    if (await validateImageQuality(selected.url)) { 
      imageCache[cacheKey] = selected.url;
      return selected.url;
    }
    return null;
  } catch (err) {
    console.error(`[Wikimedia AI] Hata oluştu (${query}):`, err.message);
    return null;
  }
}

async function searchPexelsImages(query, page, nonce = '') {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error('PEXELS_API_KEY tanımlı değil.');
    return null;
  }

  query = diversifyQuery(query); 
  const randomPage = page || Math.floor(Math.random() * 15) + 1;
  const cacheKey = `pexels:${query}:${randomPage}:${nonce}`;

  if (!nonce && page === 1 && imageCache[cacheKey]) {
    console.log(`[Cache] "${query}" için sayfa ${randomPage} önbellekten alındı.`);
    return imageCache[cacheKey];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `https://api.pexels.com/v1/search?query=${encodedQuery}&per_page=5&page=${randomPage}&orientation=landscape&locale=en-US&_=${Date.now()}`;

    console.log(`[Pexels] "${query}" (page ${randomPage}) sorgulanıyor...`);
    const response = await axios.get(url, {
      headers: { Authorization: apiKey },
      timeout: 8000,
    });

    const photos = response.data.photos;
    if (!photos || photos.length === 0) return null;

    const sorted = photos.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    const selected = sorted[Math.floor(Math.random() * sorted.length)];
    const imageUrl = selected.src.large2x || selected.src.large;

    if (await validateImageQuality(imageUrl)) { 
      if (page === 1) imageCache[cacheKey] = imageUrl;
      console.log(`[Pexels] "${query}" (${randomPage}. sayfa) görsel seçildi: ${imageUrl}`);
      return imageUrl;
    }
    return null;
  } catch (error) {
    console.error(`[Pexels] "${query}" için arama hatası:`, error.message);
    return null;
  }
}

async function validateImageQuality(imageUrl) {
  try {
    const response = await axios.head(imageUrl, { timeout: 5000 });
    const contentLength = parseInt(response.headers['content-length'] || '0');
    const contentType = response.headers['content-type'] || '';

    if (contentLength < 50000) return false;
    if (!contentType.includes('image/jpeg') && !contentType.includes('image/png')) return false;
    return true;
  } catch {
    return false;
  }
}

async function tryWikimediaWithBackoff(query) {
  const candidates = buildSimplifiedQueries(query);
  for (let i = 0; i < candidates.length; i++) {
    const q = candidates[i];
    console.log(`[ImageSearch] Wikimedia (${i + 1}. deneme): "${q}"`);
    const url = await searchWikimediaImages(q);
    if (url && await validateImageQuality(url)) {
      console.log(`[OK] Wikimedia sonucu bulundu (${i + 1}. deneme): ${url}`);
      return url;
    }
    console.log(`[X] Wikimedia başarısız (${i + 1}. deneme): "${q}"`);
  }
  return null;
}

module.exports = {
  buildSimplifiedQueries,
  searchGoogleImages,
  searchWikimediaImages,
  searchPexelsImages,
  validateImageQuality,
  tryWikimediaWithBackoff,
};
