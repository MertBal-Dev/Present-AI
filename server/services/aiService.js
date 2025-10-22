const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class RateLimiter {
  constructor() {
    this.limits = {
      'gemini-2.0-flash': { requests: [], maxPerMinute: 15 },
      'gemini-2.5-flash': { requests: [], maxPerMinute: 10 },
      'gemini-2.5-pro': { requests: [], maxPerMinute: 2 }
    };
  }

  async waitIfNeeded(modelName) {
    const limit = this.limits[modelName];
    if (!limit) return;

    const now = Date.now();
    limit.requests = limit.requests.filter(t => now - t < 60000);

    if (limit.requests.length >= limit.maxPerMinute) {
      const waitTime = 60000 - (now - limit.requests[0]) + 1000;
      console.log(`[RateLimiter] ${modelName} waiting ${Math.round(waitTime/1000)}s...`);
      await new Promise(r => setTimeout(r, waitTime));
      limit.requests = [];
    }

    limit.requests.push(now);
  }
}

const rateLimiter = new RateLimiter();

const aiResponseCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 30;



const translationCache = new Map();
const queryExpansionCache = new Map();
const CACHE_EXPIRY_MS = 1000 * 60 * 60; 

function getCached(map, key) {
  const item = map.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    map.delete(key);
    return null;
  }
  return item.value;
}

function setCached(map, key, value) {
  map.set(key, { value, expires: Date.now() + CACHE_EXPIRY_MS });
  sweepCache(map, map === translationCache ? 'TranslationCache' : 'ExpansionCache');
}





// --- Cache Cleanup Utility ---
const CACHE_SWEEP_THRESHOLD = 200; 

function sweepCache(map, label = 'Cache') {
  if (map.size > CACHE_SWEEP_THRESHOLD) {
    let removed = 0;
    const now = Date.now();
    for (const [key, entry] of map.entries()) {
      if (now > entry.expires) {
        map.delete(key);
        removed++;
      }
    }
    console.log(`[${label}] Sweeper removed ${removed} expired items. (Remaining: ${map.size})`);
  }
}



// Helpers: normalize & translate 


function normalizeQuery(text) {
  if (!text) return '';
  
  return String(text)
    .trim()
    
    .replace(/İ/g, 'i')  
    .replace(/I/g, 'ı')  
    
    .replace(/\s{2,}/g, ' ')
    
    .replace(/[""„]/g, '"')
    .replace(/[''‛]/g, "'")
    .trim();
}



async function translateToEnglish(input) {
  const src = normalizeQuery(input);
  if (!src) return '';

  const cacheKey = src.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

  const cached = getCached(translationCache, cacheKey);
  if (cached) {
    console.log(`[Cache] Translation hit: "${src}"`);
    return cached;
  }

  
  const asciiOnly = /^[\x00-\x7F]+$/.test(src.replace(/\s+/g, ''));
  if (asciiOnly) {
    setCached(translationCache, cacheKey, src);
    return src; 
  }
  
  async function tryTranslateWithModel(modelName) {
    await rateLimiter.waitIfNeeded(modelName); 
    
    const model = genAI.getGenerativeModel({ model: modelName });
    const prompt = `
Translate the following SHORT image search phrase into natural, search-friendly ENGLISH.
Return ONLY the translation text. No quotes, no extra words.

Text:
${src}
`;
    try {
      const res = await model.generateContent(prompt);
      const out = (await res.response.text()).trim().replace(/^"+|"+$/g, '');
      if (out && out.length > 0) {
        console.log(`[Translate] "${src}" → "${out}" (via ${modelName})`);
        setCached(translationCache, cacheKey, out);
        return out;
      }
      return null;
    } catch (err) {
      console.warn(`[translateToEnglish] ${modelName} failed:`, err.message);
      return null;
    }
  }

  // --- 1. Öncelik: En hızlı model ---
  let translation = await tryTranslateWithModel('gemini-2.0-flash');

  // --- 2. Seviye: Gelişmiş Flash ---
  if (!translation) {
    console.log('[Translate] Fallback → gemini-2.5-flash');
    translation = await tryTranslateWithModel('gemini-2.5-flash');
  }

  // --- 3. Seviye: Profesyonel model ---
  if (!translation) {
    console.log('[Translate] Fallback → gemini-2.5-pro');
    translation = await tryTranslateWithModel('gemini-2.5-pro');
  }

  if (!translation) {
    console.warn(`[translateToEnglish] Fallback to original: "${src}"`);
    setCached(translationCache, cacheKey, src);
    return src;
  }

  return translation;
}



async function expandQueryWithAI(baseQuery, context = '') {
  const src = normalizeQuery(baseQuery);
  if (!src) return [];

  const cacheKey = context ? `${src}__${context}` : src;
  const cached = getCached(queryExpansionCache, cacheKey);
  if (cached) {
    console.log(`[Cache] Expansion hit: "${src}" with context "${context}"`);
    return cached;
  }

  async function tryExpandWithModel(modelName) {
    await rateLimiter.waitIfNeeded(modelName); 
    
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `
You are a visual search assistant.
Given this image search phrase: "${src}"
Context: "${context || 'General topic'}"

Generate 2 SHORT alternative phrases (3-5 words each) that:
- Keep the same topic
- Use different wording or perspective
- Stay concise and search-friendly

Return ONLY a JSON array of 2 strings. NO explanations.

Example input: "Suleymaniye Mosque Istanbul"
Example output: ["Ottoman mosque architecture", "Istanbul historical building"]
`;

      const res = await model.generateContent(prompt);
      const text = (await res.response.text()).trim().replace(/```json|```/gi, '');
      return text;
    } catch (err) {
      console.warn(`[expandQueryWithAI] ${modelName} failed: ${err.message}`);
      return null;
    }
  }

  let text = null;
  for (const modelName of ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro']) {
    text = await tryExpandWithModel(modelName);
    if (text) break;
  }

  if (!text) {
    console.warn(`[expandQueryWithAI] All models failed for "${src}"`);
    return [];
  }

  let raw = text.replace(/```json|```/gi, '').trim();
  let arr = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) arr = parsed;
  } catch {
    arr = raw.split('\n').map(s => s.trim()).filter(Boolean);
  }

  const uniq = Array.from(new Set(arr.map(normalizeQuery)))
    .filter(q => q.split(' ').length <= 6)
    .slice(0, 2);

  setCached(queryExpansionCache, cacheKey, uniq);
  console.log(`[Cache] Expansion stored: "${src}" → [${uniq.join(', ')}]`);
  return uniq;
}





function generateCacheKey(topic, language) {
  return `${String(topic).toLowerCase().trim()}__${String(language).toLowerCase().trim()}`;
}

function setCache(topic, language, data) {
  const key = generateCacheKey(topic, language);
  aiResponseCache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

function getCache(topic, language) {
  const key = generateCacheKey(topic, language);
  const cached = aiResponseCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expires) {
    aiResponseCache.delete(key);
    return null;
  }
  return cached.data;
}

let lastUsedModel = null;
function getNextModel() {
  const models = ['gemini-2.5-pro', 'gemini-2.5-flash'];
  const next = lastUsedModel === models[0] ? models[1] : models[0];
  lastUsedModel = next;
  return next;
}

async function generatePresentation(topic, language) {
  const modelPriorityList = ['gemini-2.5-pro', 'gemini-2.5-flash'];
  let result = null;

  const prompt = `
You are a senior academic researcher and visual communication expert creating a university-level presentation.
Topic: "${topic}"
Language of output: ${language}. All content, titles, image keywords, and citations must be in ${language}.

---

### PROTOCOL 1 – ACADEMIC DEPTH & CITATIONS
1. Research from multiple credible sources: academic books, peer-reviewed journals, government or NGO reports, encyclopedias, and museum archives.
2. All factual statements and data must include inline citations in APA style within parentheses: (Author, Year).
   - Example: "The project began in 1930 (Kaya, 2022)."
3. Citations inside text must correspond exactly to entries in the bibliography array.

---

### PROTOCOL 2 – STRUCTURE & CONTENT QUALITY
1. Total slides: 12–16.
2. Logical flow:
   - Introduction
   - Historical Context / Background
   - Core Analysis (3–5 slides)
   - Case Study / Example
   - Challenges / Counterarguments
   - Future Trends
   - Conclusion
3. Each slide must contain:
   - One paragraph (2–4 sentences) explaining the topic analytically with citations.
   - One bullet_list (3–5 items) presenting concise factual points, also with citations.
   - Notes: A short speaker note summarizing the slide message.

---

### PROTOCOL 3 – BIBLIOGRAPHY RULES (Moved up)
1. 8-12 diverse APA 7 formatted citations:
   - ≥1 academic book
   - ≥2 journal articles
   - ≥1 institutional or governmental report
   - Remaining may include museum or credible media archives
2. Each source must have an identifiable author and year.
3. CRITICAL: Do NOT create a slide with title containing "Kaynakça", "Bibliography", "References" or similar words.
   - All bibliography entries must ONLY be in the "bibliography" array at JSON root level
   - Slides array should contain ONLY content slides

---

### PROTOCOL 4 – VISUAL QUERY DESIGN (CRITICAL)

Your task: Create highly specific, searchable image queries that will find REAL photographs (not illustrations or stock poses).

🔹 RULES FOR EACH SLIDE:

1. **Query Structure** (Turkish):
   - Use 5-7 descriptive words
   - Include SPECIFIC objects/places/people, NOT generic terms
   - Examples:
     ✅ GOOD: "1930'lar Amerikan ailesinin radyo başında fotoğrafı"
     ❌ BAD: "radyo ve insanlar"

2. **QueryEnglish Structure** (English):
   - Translate Turkish query literally
   - Add photographer-friendly terms: "photograph", "historical photo", "real scene"
   - Examples:
     ✅ GOOD: "1930s American family listening to radio photograph"
     ❌ BAD: "radio people"

3. **Context** (1 sentence):
   - Explain WHY this image matters for the slide
   - Focus on the MESSAGE, not just description
   - Examples:
     ✅ GOOD: "Shows how radio became central to family life in the 1930s"
     ❌ BAD: "A photo of people with a radio"

🔹 TOPIC-SPECIFIC GUIDELINES:

- **Historical topics**: Include decade + location + specific object/building
  Example: "1920'ler İstanbul Sirkeci Garı tren istasyonu fotoğrafı"
  
- **Scientific topics**: Include equipment/phenomenon + setting + scale
  Example: "laboratuvar mikroskobu altında hücre bölünmesi fotoğrafı"
  
- **Cultural topics**: Include cultural practice + location + time period
  Example: "geleneksel Türk kahve fincanı sunumu Osmanlı dönemi"
  
- **Technical topics**: Include machinery + process + era/setting
  Example: "1910'lar Ford Model T montaj hattı işçileri fotoğrafı"

🔹 CRITICAL REQUIREMENTS:

✓ Every slide MUST have different image keywords
✓ Use CONCRETE nouns (avoid: "teknoloji", "gelişme", "süreç")
✓ Prefer DOCUMENTARY style over artistic/abstract
✓ If place name exists, USE IT (e.g., "Bell Labs New Jersey" not "laboratory")
✓ QueryEnglish must be DIFFERENT from query (translate + add context)

🔹 FORBIDDEN TERMS (will find bad results):
❌ "beautiful", "modern", "abstract", "concept", "illustration"
❌ "technology", "development", "progress" (too generic)
❌ "people", "workers", "scene" (alone without specifics)

🔹 FORMAT (strict):
"imageKeywords": {
  "query": "Specific 5-7 word Turkish phrase with concrete nouns",
  "queryEnglish": "English translation + 'photograph' or 'historical photo'",
  "context": "One sentence explaining the image's narrative purpose"
}

**REMINDER**: Context is NOT image description. Context explains the slide's MESSAGE through the image.

---

### PROTOCOL 5 – JSON FORMAT & FINAL OUTPUT
Output only a valid JSON object (no explanations, no markdown).
The JSON object must follow this exact structure:
{
  "title": "string",
  "slides": [
    {
      "slideNumber": integer,
      "title": "string",
      "content": [
        {"type": "paragraph", "value": "Text with (Author, Year) citations."},
        {"type": "bullet_list", "items": [
          "**Key fact:** ... (Smith, 2018)",
          "**Example:** ... (UNESCO, 2020)"
        ]}
      ],
      "notes": "Short presenter note",
      "imageKeywords": {
        "query": "A specific, 5-7 word photographic query in ${language}",
        "queryEnglish": "English translation for search",
        "context": "What this image should convey"
      }
    }
  ],
  "bibliography": [
    {"citation": "Author, A. A. (Year). Title of work. Publisher."}
  ]
}`;


for (const modelName of modelPriorityList) {
  try {
    await rateLimiter.waitIfNeeded(modelName); 
    
    console.log(`[Gemini] Denenen model: ${modelName}...`);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' }
    });

    let lastErr = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        result = await model.generateContent(prompt);
        console.log(`[Gemini] Başarılı: ${modelName} (attempt ${attempt}).`);
        break;
      } catch (e) {
        lastErr = e;
        const wait = 500 * attempt;
        console.warn(`[Gemini] ${modelName} attempt ${attempt} hata: ${e.message} (bekleniyor ${wait}ms)`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
    if (result) break;
    if (!result && lastErr) throw lastErr;
  } catch (error) {
    console.warn(`[Gemini] Model ${modelName} hatası:`, error.message);
  }
}

  if (!result) throw new Error('Tüm AI modelleri denendi ancak hiçbiri yanıt vermedi.');

  
  let rawTextFromAI = result.response?.text?.() || result.response?.text || '';
  rawTextFromAI = String(rawTextFromAI);

  
  let cleaned = rawTextFromAI
    .replace(/```json|```/gi, '')
    .replace(/^\s*Output only.*?\n/si, '')
    .trim();

  
  let presentationData = null;
  try {
    presentationData = JSON.parse(cleaned);
  } catch (e) {
    
    cleaned = cleaned
      .replace(/\,(?=\s*[\}\]])/g, '')  
      .replace(/[\u0000-\u001F]+/g, ''); 
    presentationData = JSON.parse(cleaned);
  }

  
  if (!presentationData || typeof presentationData !== 'object') {
    throw new Error('AI output is not a valid object');
  }
  if (!Array.isArray(presentationData.slides)) {
    presentationData.slides = [];
  }
  
  if (presentationData.slides.length > 16) {
    presentationData.slides = presentationData.slides.slice(0, 16);
  }
  if (presentationData.slides.length < 12) {
    
    console.warn(`[Normalize] Slide count < 12: ${presentationData.slides.length}`);
  }

  
  presentationData.slides = presentationData.slides.map((s, idx) => {
    const slide = s && typeof s === 'object' ? s : {};
    slide.slideNumber = idx + 1;
    slide.title = String(slide.title || `Slide ${idx + 1}`);
    
    if (!Array.isArray(slide.content)) slide.content = [];
    
    slide.notes = String(slide.notes || '');
    
    const ik = slide.imageKeywords || {};
    slide.imageKeywords = {
      query: String(ik.query || '').trim(),
      queryEnglish: String(ik.queryEnglish || '').trim(),
      context: String(ik.context || slide.title).trim()
    };
    return slide;
  });

  if (!Array.isArray(presentationData.bibliography)) {
    presentationData.bibliography = [];
  }

  return { presentationData, rawTextFromAI };
}

async function visionRelevanceScore(query, imageUrl) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const prompt = `\nAnalyze the image and the query.\n\nQuery: "${query}"\nImage URL: ${imageUrl}\n\nTask: Rate how well the image *visually represents* the user's query. Is it a good, relevant, high-quality photograph for this topic? A score of 0 is irrelevant (e.g., a cartoon for a historical topic). A score of 100 is a perfect, high-quality, photographic match.\n\nOutput only a single number (0-100).\n`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const numericScore = parseInt(text.match(/\d+/)?.[0] || '0', 10);
    return Math.min(Math.max(numericScore, 0), 100);
  } catch (err) {
    console.warn(`[VisionCheck] Skor alınamadı (${imageUrl}):`, err.message);
    throw err; 
  }
}

async function extractImageMetaKeywords(imageUrl) {
  try {
    
    let pageUrl = imageUrl;
    
    
    if (imageUrl.includes('wikimedia.org') || imageUrl.includes('wikipedia.org')) {
      
      const fileName = imageUrl.match(/\/([^\/]+?)(?:\.[^.\/]+)?$/)?.[1];
      if (fileName) {
        const decodedName = decodeURIComponent(fileName);
        
        const keywords = decodedName
          .replace(/[_-]/g, ' ')
          .replace(/\d+px/g, '')
          .replace(/\.(jpg|png|jpeg|webp|svg)/gi, '')
          .trim();
        
        console.log(`[MetaExtract] Wikimedia keywords from filename: "${keywords}"`);
        return keywords.toLowerCase();
      }
    }
    
    
    if (imageUrl.includes('pexels.com')) {
      
      const photoId = imageUrl.match(/photos\/(\d+)/)?.[1];
      if (photoId && process.env.PEXELS_API_KEY) {
        try {
          const res = await axios.get(`https://api.pexels.com/v1/photos/${photoId}`, {
            headers: { Authorization: process.env.PEXELS_API_KEY },
            timeout: 5000
          });
          const alt = res.data?.alt || '';
          console.log(`[MetaExtract] Pexels alt text: "${alt}"`);
          return alt.toLowerCase();
        } catch (err) {
          console.warn(`[MetaExtract] Pexels API failed: ${err.message}`);
        }
      }
    }
    
    
    try {
      const headRes = await axios.head(imageUrl, { 
        timeout: 3000,
        maxRedirects: 3
      });
      
      
      const contentDisposition = headRes.headers['content-disposition'];
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (fileNameMatch && fileNameMatch[1]) {
          const fileName = fileNameMatch[1].replace(/['"]/g, '');
          const keywords = fileName
            .replace(/[_-]/g, ' ')
            .replace(/\.(jpg|png|jpeg|webp|svg)/gi, '')
            .trim();
          console.log(`[MetaExtract] Keywords from Content-Disposition: "${keywords}"`);
          return keywords.toLowerCase();
        }
      }
    } catch (err) {
      console.warn(`[MetaExtract] HEAD request failed: ${err.message}`);
    }
    
    
    const urlPath = new URL(imageUrl).pathname;
    const pathKeywords = urlPath
      .split('/')
      .pop()
      ?.replace(/[_-]/g, ' ')
      .replace(/\.(jpg|png|jpeg|webp|svg)/gi, '')
      .replace(/\d+/g, '')
      .trim() || '';
    
    console.log(`[MetaExtract] Keywords from URL path: "${pathKeywords}"`);
    return pathKeywords.toLowerCase();
    
  } catch (error) {
    console.warn(`[MetaExtract] Failed to extract metadata from ${imageUrl}:`, error.message);
    return '';
  }
}

async function computeKeywordSimilarityScore(query, metaText) {
  if (!query || !metaText) return 0;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const prompt = `\nCompare semantic similarity between two descriptions:\nA) "${query}"\nB) "${metaText}"\nReturn only a single integer (0–100) indicating how similar they are.\n`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const score = parseInt(text.match(/\d+/)?.[0] || '0', 10);
    return Math.min(Math.max(score, 0), 100);
  } catch (err) {
    console.warn('[KeywordSim] Benzerlik skoru alınamadı:', err.message);
    throw err; 
  }
}

function validateInlineCitations(presentationData) {
  const bibCitations = (presentationData.bibliography || [])
    .map(b => (b.citation || '').toLowerCase().trim());
  const missingRefs = [];
  for (const slide of presentationData.slides || []) {
    const allText = JSON.stringify(slide.content || []).toLowerCase();
    const matches = [...allText.matchAll(/\(([a-zğüşiöç\s]+),\s*(\d{4})\)/gi)];
    for (const m of matches) {
      const refCandidate = `${m[1].trim()} (${m[2]})`;
      if (!bibCitations.some(b => b.includes(m[1]) && b.includes(m[2]))) {
        missingRefs.push({ slide: slide.slideNumber, ref: refCandidate });
      }
    }
  }
  return missingRefs;
}

async function validateBibliographyURLs(presentationData) {
  const results = [];
  for (const entry of presentationData.bibliography || []) {
    const text = entry.citation || '';
    const urlMatch = text.match(/https?:\/\/[^\s)]+/);
    if (!urlMatch) continue;
    const url = urlMatch[0];
    try {
      const res = await axios.head(url, { timeout: 4000 });
      results.push({ url, ok: res.status < 400, status: res.status });
    } catch {
      results.push({ url, ok: false, status: 'unreachable' });
    }
  }
  return results;
}

function autoRankSlides(presentationData) {
  const ranked = [];
  for (const slide of presentationData.slides || []) {
    const text = JSON.stringify(slide.content || []);
    const citationCount = (text.match(/\(\w+,\s*\d{4}\)/g) || []).length;
    const wordCount = text.split(/\s+/).length;
    const hasImage = !!slide.imageUrl;
    const score = Math.min(
      100,
      (wordCount / 80) * 20 + citationCount * 10 + (hasImage ? 20 : 0)
    );
    ranked.push({ slideNumber: slide.slideNumber, title: slide.title, score: Math.round(score) });
  }
  return ranked;
}

module.exports = {
  getCache,
  setCache,
  generatePresentation,
  visionRelevanceScore,
  extractImageMetaKeywords,
  computeKeywordSimilarityScore,
  validateInlineCitations,
  validateBibliographyURLs,
  autoRankSlides,
  translateToEnglish,
  expandQueryWithAI,
  normalizeQuery
};