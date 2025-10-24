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

### PROTOCOL 3 – VISUAL QUERY DESIGN (CRITICAL)
You are a professional presentation design assistant. Your goal is to suggest visuals that accurately represent each slide's core idea, are aesthetically strong, and support the narrative.

🔹 Essential Visual Criteria:

1. **Topic Relevance**: The visual must directly relate to the slide's title and content.
   - If scientific → real object, location, or event photo (NOT abstract art)
   - If cultural/historical → accurate representation of the period, location, or artifact

2. **Narrative Power**: Visual should complement (not repeat) the slide text and add "story"
   - "Geological processes" → natural formation scene
   - "Historical context" → period architecture or people
   - "Analysis/conclusion" → summarizing symbol, map, or harmonious abstract texture

3. **Composition Requirements**:
   - Horizontal (16:9) aspect ratio preferred
   - Main subject centered or aligned with golden ratio
   - Clean background; avoid clutter that reduces text readability
   - No excessive empty space or extreme close-ups

4. **Color & Tone Harmony**:
   - Soft tones matching presentation theme (avoid oversaturated, neon, or dark colors)
   - Contrast should highlight text, not distract
   - Natural color balance preferred (avoid over-filtered or HDR looks)

5. **Style Consistency**:
   - Maintain same style across all slides: all photos OR all illustrations
   - Don't mix stock photos with vectors in same presentation
   - If human figures present, same cultural/geographic context

6. **License & Ethics**:
   - Prefer public domain (CC0) or open licenses (CC BY-SA)
   - NEVER: violence, weapons, blood, political symbols, brand logos, inappropriate objects
   - AI-generated images only for "conceptual/abstract explanations"

7. **Mental Association**:
   - Visual should immediately convey "what it wants to tell"
   - Reject objects that symbolize but are unrelated (e.g., rifle instead of fairy chimneys)
   - Should spark curiosity but stay on topic

8. **Language & Cultural Balance**:
   - Even if topic is in Turkish, follow international presentation aesthetics
   - If cultural elements present, use real places, arts, or natural structures from that country
   - Text language and visual cultural tone must not conflict

🔹 Image Query Format:

Each slide MUST include: "imageKeywords": { "query": "...", "queryEnglish": "...", "context": "..." }

- **query**: 4-8 descriptive words in ${language}, depicting a photographable real-world scene
- **queryEnglish**: English translation of the query for better search results
- **context**: Brief explanation of what the image should convey (1 sentence)

Examples:
GOOD: 
{
  "query": "Kapadokya peri bacaları gün batımı",
  "queryEnglish": "Cappadocia fairy chimneys sunset landscape",
  "context": "Shows the unique geological formations of the region"
}

BAD:
{
  "query": "güzel manzara",
  "queryEnglish": "beautiful landscape",
  "context": "Generic scene"
}

SPECIFIC REQUIREMENTS:
- For historical topics: Include time period, location, and specific artifact/building
- For scientific topics: Include specific phenomenon, equipment, or natural formation
- For cultural topics: Include cultural practice, traditional object, or architectural style
- For technical topics: Include machinery, process, or workplace setting

🔹 Good Visual Checklist:
✓ Directly related to topic
✓ Real and high resolution
✓ Balanced composition with text
✓ Color harmonious
✓ Aesthetically pleasing and license-safe

🔹 Bad Visual Checklist:
✗ Unrelated objects (e.g., rifle, animal, fashion shoot)
✗ Over-posed stock scene
✗ Over-filtered or cartoonish
✗ Vertical/distorted ratio
✗ Colors that shadow text or distract

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
      "imageKeywords": {
        "query": "detailed query in ${language}",
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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
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