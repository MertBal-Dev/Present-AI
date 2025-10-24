const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


const aiResponseCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 30;

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
  const modelPriorityList = [getNextModel()];
  let result = null;

  const prompt = `
You are a senior academic researcher and visual communication expert creating a university-level presentation.
Output only a valid JSON object (no explanations, no markdown).

Topic: "${topic}"
Language of output: ${language}. All content, titles, image keywords, and citations must be written in ${language}.


---

### PROTOCOL 1 – ACADEMIC DEPTH & CITATIONS
1. Research from multiple credible sources: academic books, peer-reviewed journals, government or NGO reports, encyclopedias, and museum archives.
2. All factual statements and data must include inline citations in APA style within parentheses: (Author, Year).
   - Example: "The project began in 1930 (Kaya, 2022)."
3. Citations inside text must correspond exactly to entries in the bibliography array.

---

### PROTOCOL 2 – STRUCTURE & CONTENT QUALITY
1. Total slides: 10–15.
2. Logical flow:
   - Introduction
   - Historical Context / Background
   - Core Analysis (2–4 slides)
   - Case Study / Example
   - Challenges / Counterarguments
   - Future Trends
   - Conclusion
3. Each slide must contain:
   - One paragraph (2–4 sentences) explaining the topic analytically with citations.
   - One bullet_list (3–5 items) presenting concise factual points, also with citations.
   - Notes: A short speaker note summarizing the slide message.

---

### PROTOCOL 3 – VISUAL QUERY DESIGN
1. Each slide must include: 
   "imageKeywords": { "query": "..." }
2. The query must be:
   - Written in ${language}
   - 3–6 descriptive words
   - Depicting a photographable real-world scene
   - Related directly to the slide content
   - Example: GOOD: "engineer adjusting robotic arm in factory"

---

### PROTOCOL 4 – BIBLIOGRAPHY RULES
1. 8–12 diverse APA 7 formatted citations:
   - ≥1 academic book
   - ≥2 journal articles
   - ≥1 institutional or governmental report
   - Remaining may include museum or credible media archives
2. Each source must have an identifiable author and year.

---

### PROTOCOL 5 – JSON FORMAT
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
      "imageKeywords": {"query": "..." }
    }
  ],
  "bibliography": [
    {"citation": "Author, A. A. (Year). Title of work. Publisher."}
  ]
}`;

  for (const modelName of modelPriorityList) {
    try {
      console.log(`[Gemini] Denenen model: ${modelName}...`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' }
      });
      result = await model.generateContent(prompt);
      console.log(`[Gemini] Başarılı: ${modelName} modeli yanıt verdi.`);
      break;
    } catch (error) {
      console.warn(`[Gemini] Model ${modelName} hatası:`, error.message);
    }
  }
  if (!result) throw new Error('Tüm AI modelleri denendi ancak hiçbiri yanıt vermedi.');

  const rawTextFromAI = result.response.text();
  const presentationData = JSON.parse(rawTextFromAI);
  return { presentationData, rawTextFromAI };
}

async function visionRelevanceScore(query, imageUrl) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `\nRate the semantic relevance between the following image and the topic description.\nTopic: "${query}"\nImage URL: ${imageUrl}\nOutput only a number between 0 and 100 – higher means more relevant.\n`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const numericScore = parseInt(text.match(/\d+/)?.[0] || '0', 10);
    return Math.min(Math.max(numericScore, 0), 100);
  } catch (err) {
    console.warn(`[VisionCheck] Skor alınamadı (${imageUrl}):`, err.message);
    return 0;
  }
}

async function extractImageMetaKeywords(imageUrl) {
  try {
    const response = await axios.get(imageUrl, { timeout: 5000 });
    const html = response.data || '';
    const metaKeywords = [];
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const metaKeywordMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const altTexts = [...html.matchAll(/alt=["']([^"']+)["']/gi)].map(m => m[1]);
    if (titleMatch) metaKeywords.push(titleMatch[1]);
    if (metaDescMatch) metaKeywords.push(metaDescMatch[1]);
    if (metaKeywordMatch) metaKeywords.push(metaKeywordMatch[1]);
    if (altTexts.length) metaKeywords.push(...altTexts);
    return metaKeywords.join(' ').replace(/[\n\r\t]+/g, ' ').trim().toLowerCase();
  } catch (error) {
    console.warn(`[MetaExtract] Meta veriler alınamadı (${imageUrl}):`, error.message);
    return '';
  }
}

async function computeKeywordSimilarityScore(query, metaText) {
  if (!query || !metaText) return 0;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `\nCompare semantic similarity between two descriptions:\nA) "${query}"\nB) "${metaText}"\nReturn only a single integer (0–100) indicating how similar they are.\n`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const score = parseInt(text.match(/\d+/)?.[0] || '0', 10);
    return Math.min(Math.max(score, 0), 100);
  } catch (err) {
    console.warn('[KeywordSim] Benzerlik skoru alınamadı:', err.message);
    return 0;
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
};

