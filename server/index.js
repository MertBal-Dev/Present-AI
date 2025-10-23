
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { PDFDocument, rgb } = require('pdf-lib');
const pptxgen = require("pptxgenjs");
const { createClient } = require('pexels');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const fontkit = require('fontkit');

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const port = 5001;
const pexelsClient = process.env.PEXELS_API_KEY ? createClient(process.env.PEXELS_API_KEY) : null;
const imageCache = {};

let mainFontBytes = null;
let boldFontBytes = null;
try {
  mainFontBytes = fs.readFileSync(path.join(__dirname, 'fonts', 'NotoSans-Regular.ttf'));
  boldFontBytes = fs.readFileSync(path.join(__dirname, 'fonts', 'NotoSans-Bold.ttf'));
  console.log("TTF font dosyaları başarıyla belleğe yüklendi.");
} catch (error) {
  console.error("Kritik Hata: Font dosyaları yüklenemedi! PDF oluşturma özelliği çalışmayacaktır.", error.message);

}

// --- TEMA TANIMLARI ---
const themes = {
  default: {
    bgColor: { pdf: rgb(1, 1, 1), pptx: 'FFFFFF' },
    titleColor: { pdf: rgb(0, 0.32, 0.61), pptx: '00529B' },
    textColor: { pdf: rgb(0.1, 0.1, 0.1), pptx: '1A1A1A' },
  },
  dark: {
    bgColor: { pdf: rgb(0.16, 0.17, 0.2), pptx: '282C34' },
    titleColor: { pdf: rgb(0.38, 0.85, 0.98), pptx: '61DAFB' },
    textColor: { pdf: rgb(0.9, 0.9, 0.9), pptx: 'E6E6E6' },
  },
  corporate: {
    bgColor: { pdf: rgb(0.96, 0.96, 0.96), pptx: 'F5F5F5' },
    titleColor: { pdf: rgb(0.85, 0.33, 0.31), pptx: 'D9534F' },
    textColor: { pdf: rgb(0.2, 0.2, 0.2), pptx: '333333' },
  },
  forest: {
    bgColor: { pdf: rgb(0.98, 0.98, 0.96), pptx: 'FCFCF5' },
    titleColor: { pdf: rgb(0.2, 0.4, 0.2), pptx: '336633' },
    textColor: { pdf: rgb(0.25, 0.25, 0.25), pptx: '404040' },
  },
};

const getTheme = (themeName) => themes[themeName] || themes.default;

function hexToRgbPdf(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  return rgb(r, g, b);
}

// --- ZENGİN METİN YARDIMCILARI ---
function htmlToPptx(html) {
  const cleanHtml = (html || '').replace(/<[^>]*>/g, '');
  const parts = [];
  const regex = /\*\*(.*?)\*\*|\*(.*?)\*|([^*]+)/g;
  let match;

  while ((match = regex.exec(cleanHtml)) !== null) {
    if (!match[0].trim()) continue;
    if (match[1]) {
      parts.push({ text: match[1], options: { bold: true } });
    } else if (match[2]) {
      parts.push({ text: match[2], options: { italic: true } });
    } else if (match[3]) {
      parts.push({ text: match[3] });
    }
  }
  if (parts.length === 0 && cleanHtml) {
    return [{ text: cleanHtml }];
  }
  return parts;
}

// --- PDF İÇİN METİN SATIR SARMA FONKSİYONU ---
function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// --- GÖRSEL ARAMA İYİLEŞTİRMELERİ ---

async function searchGoogleImages(query, page = 1) {
  if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX_ID) {
    console.log("Google API anahtarları yapılandırılmamış, bu kaynak atlanıyor.");
    return null;
  }
  const cacheKey = `google:${query}:${page}`;
  if (imageCache[cacheKey]) {
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
        rights: 'cc_publicdomain,cc_attribute,cc_sharealike'
      }
    });
    if (response.data.items && response.data.items.length > 0) {
      const imageUrl = response.data.items[0].link;
      imageCache[cacheKey] = imageUrl;
      return imageUrl;
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

async function searchWikimediaImages(query) {
  const cacheKey = `wikimedia:${query}`;
  if (imageCache[cacheKey]) return imageCache[cacheKey];

  try {
    const url = `https://commons.wikimedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=5`;
    const response = await axios.get(url, { timeout: 8000 });

    if (!response.data.pages || response.data.pages.length === 0) {
      console.warn(`[Wikimedia REST] "${query}" için sonuç bulunamadı.`);
      return null;
    }

    const pageTitles = response.data.pages.map(p => p.title);
    console.log(`[Wikimedia REST] "${query}" için ${pageTitles.length} sonuç bulundu.`);

    const fileTitle = pageTitles.find(t => t.toLowerCase().includes('file:')) || pageTitles[0];
    const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;
    const imageResponse = await axios.get(imageInfoUrl, { timeout: 8000 });

    const pages = imageResponse.data.query?.pages || {};
    const imageCandidates = Object.values(pages)
      .flatMap(p => p.imageinfo || [])
      .filter(img => img.mime?.startsWith('image/'))
      .map(img => img.url);

    if (imageCandidates.length > 0) {
      const imageUrl = imageCandidates[0];
      imageCache[cacheKey] = imageUrl;
      return imageUrl;
    }

    return null;
  } catch (error) {
    console.error(`[Wikimedia REST] Görsel arama hatası (${query}):`, error.message);
    return null;
  }
}



async function searchPexelsImages(query, page) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error("PEXELS_API_KEY tanımlı değil.");
    return null;
  }

  const randomPage = page || Math.floor(Math.random() * 5) + 1;

  const cacheKey = `pexels:${query}:${randomPage}`;
  if (imageCache[cacheKey]) {
    console.log(`[Cache] "${query}" için sayfa ${randomPage} önbellekten alındı.`);
    return imageCache[cacheKey];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `https://api.pexels.com/v1/search?query=${encodedQuery}&per_page=5&page=${randomPage}&orientation=landscape&locale=tr-TR`;

    console.log(`[Pexels] "${query}" (page ${randomPage}) sorgulanıyor...`);
    const response = await axios.get(url, {
      headers: { Authorization: apiKey },
      timeout: 8000,
    });

    const photos = response.data.photos;
    if (!photos || photos.length === 0) {
      console.warn(`[Pexels] "${query}" için sonuç yok.`);
      return null;
    }

    const sorted = photos.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    const selected = sorted[0];
    const imageUrl = selected.src.large2x || selected.src.large;

    imageCache[cacheKey] = imageUrl;
    console.log(`[Pexels] "${query}" için seçilen görsel (${randomPage}. sayfa): ${imageUrl}`);

    return imageUrl;
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

    if (contentLength < 50000) {
      return false;
    }
    if (!contentType.includes('image/jpeg') && !contentType.includes('image/png')) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- ROUTES ---
app.get('/', (req, res) => {
  res.json({ message: "API is working!" });
});

app.post('/api/search-image', async (req, res) => {
  try {
    const { query, page = 1 } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Sorgu gerekli.' });
    }

    let imageUrl = null;

    // 1️⃣ GOOGLE IMAGE SEARCH
    try {
      console.log(`[ImageSearch] Google'da aranıyor (deneme ${page}): "${query}"`);
      const candidateUrl = await searchGoogleImages(query, page);
      if (candidateUrl && await validateImageQuality(candidateUrl)) {
        imageUrl = candidateUrl;
        console.log(`[ImageSearch] Google sonucu bulundu ✅`);
      }
    } catch (error) {
      console.warn(`[ImageSearch] Google arama hatası: ${error.message}`);
      if (error.message === 'Google Quota Exceeded') {
        console.log(`[ImageSearch] Google kotası dolu, Wikimedia'ya geçiliyor...`);
      } else {
        console.log(`[ImageSearch] Google başarısız, Wikimedia deneniyor...`);
      }
    }

    // 2️⃣ WIKIMEDIA COMMONS FALLBACK
    if (!imageUrl) {
      console.log(`[ImageSearch] Wikimedia Commons aranıyor: "${query}"`);
      const wikiUrl = await searchWikimediaImages(query);
      if (wikiUrl && await validateImageQuality(wikiUrl)) {
        imageUrl = wikiUrl;
        console.log(`[ImageSearch] Wikimedia sonucu bulundu ✅`);
      } else {
        console.log(`[ImageSearch] Wikimedia'da uygun sonuç bulunamadı.`);
      }
    }

    // 3️⃣ PEXELS FALLBACK
    if (!imageUrl) {
      console.log(`[ImageSearch] Pexels deneniyor: "${query}"`);
      const pexelsUrl = await searchPexelsImages(query, page);
      if (pexelsUrl && await validateImageQuality(pexelsUrl)) {
        imageUrl = pexelsUrl;
        console.log(`[ImageSearch] Pexels sonucu bulundu ✅`);
      } else {
        console.log(`[ImageSearch] Pexels'ta da sonuç bulunamadı ❌`);
      }
    }

    // ✅ SONUÇ DÖNÜŞ
    if (imageUrl) {
      res.json({ imageUrl });
    } else {
      res.status(404).json({
        imageUrl: null,
        message: 'Kaliteli görsel bulunamadı. Lütfen farklı bir konu deneyin.'
      });
    }

  } catch (error) {
    console.error(`[ImageSearch] Genel hata: ${error.message}`);
    res.status(500).json({ error: 'Görsel araması başarısız oldu.' });
  }
});


app.post('/api/generate-content', async (req, res) => {
  let rawTextFromAI = '';
  try {
    const { topic, language } = req.body;
    if (!topic) { return res.status(400).json({ error: 'Konu gerekli.' }); }

    const modelPriorityList = [
      'gemini-2.5-pro',
      'gemini-2.5-flash'
    ];

    let result = null;

    const prompt = `
        You are a distinguished academic researcher, a meticulous data analyst, and a visionary art director, tasked with creating a university-level presentation.
        Your output must be a single, syntactically perfect JSON object. Do NOT include any commentary, explanations, or Markdown formatting like \`\`\`json.

        The presentation topic is: "${topic}"
        The output language must be: ${language}

        ---

        ### PROTOCOL 1: ACADEMIC RESEARCH & CITATION (MANDATORY)

        1.  **Multi-Source Research:** You must synthesize information from a wide array of credible sources.
        2.  **Bibliography Requirements:** The final "bibliography" array MUST contain **between 8 and 12 diverse sources**. This list must be varied and include:
            * At least **one academic book**.
            * At least **two peer-reviewed journal articles**.
            * At least **one report** from a government agency, NGO, or reputable institution.
            * The remainder can include encyclopedias, reputable news archives, or museum databases.
        3.  **Citation Format:** All entries in the "bibliography" array must strictly adhere to the **APA 7 citation style**.

        ---

        ### PROTOCOL 2: PRESENTATION STRUCTURE & CONTENT DEPTH (MANDATORY)

        1.  **Slide Count:** The presentation must contain **between 10 and 15 slides** to ensure comprehensive coverage of the topic.
        2.  **Logical Narrative Flow:** The slides must follow a clear and logical progression:
            * **Introduction:** Hook the audience, state the topic's importance.
            * **Historical Context / Background:** Provide necessary foundational knowledge.
            * **Core Analysis (Multiple Slides):** Break down the main arguments, data, and critical points.
            * **Case Study / Real-World Examples:** Illustrate the concepts with tangible examples.
            * **Challenges / Counterarguments:** Present a balanced view by discussing difficulties or opposing perspectives.
            * **Future Outlook / Trends:** Discuss the future implications and emerging trends related to the topic.
            * **Conclusion:** Summarize the key takeaways and provide a powerful closing statement.
        3.  **Rich Slide Content:** Each slide's "content" array must be rich and informative. It must contain:
            * At least one **detailed analytical paragraph** (minimum 3-4 sentences) that explains the core concept of the slide.
            * At least one **bullet_list** that presents factual data, statistics, key features, or comparative points. Use bolding (\`**\`) for emphasis on key terms or data.

        ---

        ### PROTOCOL 3: VISUAL KEYWORD DIRECTION (MANDATORY FOR IMAGE RELEVANCE)

        Your primary goal is to generate a search query that will find a **highly relevant, contextually accurate, and high-quality photograph**.

        #### A. Core Principles:
        * **TOPIC-FIRST & CONTEXT RULE:** The query MUST directly reflect the slide's specific subject. Avoid generic terms.
            * **BAD:** Slide "Jupiter's Moons" -> query: "space"
            * **GOOD:** Slide "Jupiter's Moons" -> query: "planet jupiter and its moons europa ganymede"
            * **BAD:** Slide "AI in Healthcare" -> query: "technology"
            * **GOOD:** Slide "AI in Healthcare" -> query: "doctor analyzing mri scan with artificial intelligence"
        * **LANGUAGE CONSISTENCY:** The image query must be in the same language as the presentation: **${language}**.
        * **RELEVANCE OVER AESTHETICS:** Focus on what the image *shows*, not how it *looks*. **Strictly forbid** stylistic, artistic, or abstract terms like "cinematic," "abstract," "minimalist," "dramatic lighting," "concept," or "3D render." The query should describe a real-world scene or object.

        #### B. Context Enrichment:
        * **Technology/Science:** Add the application or a specific detail. (e.g., "graphene structure microscope view", "quantum computer laboratory interior").
        * **Business/Economy:** Add the environment or action. (e.g., "diverse business team collaborating in modern office", "global stock market data on screen").
        * **History/Culture:** Add the location, era, or specific artifact. (e.g., "ancient Göbeklitepe archaeological site Turkey", "Ottoman empire calligraphy art detail").

        #### C. Technical Rules:
        * **Query Length:** Aim for **3 to 6 descriptive words**.
        * **Describe a Photographable Reality:** The query must describe something that can be photographed. Avoid unsearchable abstract concepts like "the future" or "innovation." Instead, describe their visual representation.
            * **Instead of:** "innovation" -> **Use:** "glowing fiber optic cables data transfer"
            * **Instead of:** "growth" -> **Use:** "business analyst pointing at upward trend chart"

        ---

        ### PROTOCOL 4: JSON OUTPUT FORMAT (STRICT)

        The final output must be a single, valid JSON object matching this exact structure.

        {
          "title": "string (The main title of the presentation)",
          "slides": [
            {
              "slideNumber": integer,
              "title": "string (The specific title for this slide)",
              "content": [
                {
                  "type": "paragraph",
                  "value": "A detailed, well-written paragraph of at least 3-4 sentences explaining the slide's main point."
                },
                {
                  "type": "bullet_list",
                  "items": [
                    "**Key Fact:** A data-driven or factual statement.",
                    "**Supporting Detail:** Another piece of information that elaborates on the topic.",
                    "**Example:** A brief, relevant example."
                  ]
                }
              ],
              "notes": "string (A concise speaker note for the presenter, summarizing the key message of the slide.)",
              "imageKeywords": {
                "query": "string (A 3-6 word, context-rich, and descriptive search phrase in ${language} that adheres strictly to Protocol 3.)"
              }
            }
          ],
          "bibliography": [
            {
              "citation": "string (A full citation in APA 7 format. Example: Author, A. A. (Year). Title of work. Publisher.)"
            }
          ]
        }
    `;

    for (const modelName of modelPriorityList) {
      try {
        console.log(`[Gemini] Denenen model: ${modelName}...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
          }
        });

        result = await model.generateContent(prompt);
        console.log(`[Gemini] Başarılı: ${modelName} modeli yanıt verdi.`);
        break;
      } catch (error) {
        console.warn(`[Gemini] Model ${modelName} ile ilgili hata:`, error.message);
      }
    }

    if (!result) {
      throw new Error("Tüm AI modelleri denendi ancak hiçbiri yanıt vermedi.");
    }

   rawTextFromAI = result.response.text();
    const presentationData = JSON.parse(rawTextFromAI);

    const imageSearchPromises = presentationData.slides.map(slide => {
      if (!slide.imageKeywords?.query) {
        return Promise.resolve(null);
      }
      const query = slide.imageKeywords.query.trim();

      return (async () => {
        let imageUrl = null;
        
        try {
            console.log(`[ImageSearch] Google'da aranıyor: "${query}"`);
            const candidateUrl = await searchGoogleImages(query, 1);
            if (candidateUrl && await validateImageQuality(candidateUrl)) {
                imageUrl = candidateUrl;
            }
        } catch (error) {
            if (error.message === 'Google Quota Exceeded') {
                console.log(`[ImageSearch] Google kotası dolu, Pexels'e geçiliyor: "${query}"`);
                const candidateUrl = await searchPexelsImages(query, 1);
                if (candidateUrl && await validateImageQuality(candidateUrl)) {
                    imageUrl = candidateUrl;
                }
            }
        }

        return imageUrl;
      })();
    });


    console.log(`[ImageSearch] ${imageSearchPromises.length} adet görsel araması paralel olarak başlatılıyor...`);
    const resolvedImageUrls = await Promise.all(imageSearchPromises);
    console.log(`[ImageSearch] Tüm görsel aramaları tamamlandı.`);


    presentationData.slides.forEach((slide, index) => {
      slide.imageUrl = resolvedImageUrls[index] || null;
    });

    res.json(presentationData);

  } catch (error) {
    console.error("Sunum içeriği oluşturulurken bir hata oluştu:", error.message);
    if (rawTextFromAI) {
      console.error("Yapay zekadan gelen ham metin:", rawTextFromAI);
    }
    const userFriendlyError = "Sunum oluşturulamadı. Yapay zeka geçerli bir yanıt vermemiş olabilir. Lütfen konuyu değiştirip tekrar deneyin.";
    res.status(500).json({ error: userFriendlyError });
  }
});



app.post('/api/download-pdf', async (req, res) => {
  try {
    const { presentationData, theme: themeName } = req.body;
    const selectedTheme = getTheme(themeName);

    if (!mainFontBytes || !boldFontBytes) {
      throw new Error("Sunucu fontları belleğe yüklenemediği için PDF oluşturulamıyor.");
    }

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const customFont = await pdfDoc.embedFont(mainFontBytes);
    const customBoldFont = await pdfDoc.embedFont(boldFontBytes);


    const A4_LANDSCAPE = { width: 841.89, height: 595.28 };
    const MARGIN = 57;

    const FONT_SIZE_H1 = 34;    // 32-36pt aralığında
    const FONT_SIZE_BODY = 14;   // 12-14pt aralığında
    const FONT_SIZE_FOOTER = 8;

    const LINE_HEIGHT_H1 = 40;
    const LINE_HEIGHT_BODY = 20;

    const BULLET_INDENT = 20;
    const COLUMN_GAP = 30;

    // Renkler
    const TEXT_COLOR = selectedTheme.textColor.pdf;
    const TITLE_COLOR = selectedTheme.titleColor.pdf;
    const FOOTER_COLOR = rgb(0.5, 0.5, 0.5);

    // --- Slayt Oluşturma Döngüsü ---
    for (const [index, slide] of presentationData.slides.entries()) {

      const page = pdfDoc.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);
      const { width, height } = page.getSize();
      page.drawRectangle({ x: 0, y: 0, width, height, color: selectedTheme.bgColor.pdf });


      const usableWidth = width - MARGIN * 2 - COLUMN_GAP;
      const contentWidth = usableWidth / 2;
      const imageWidth = usableWidth / 2;
      const imageStartX = MARGIN + contentWidth + COLUMN_GAP;


      let currentY = height - MARGIN;


      const titleLines = wrapText(slide.title, customBoldFont, FONT_SIZE_H1, contentWidth);
      for (const line of titleLines) {
        page.drawText(line, { x: MARGIN, y: currentY, font: customBoldFont, size: FONT_SIZE_H1, color: TITLE_COLOR });
        currentY -= LINE_HEIGHT_H1;
      }
      currentY -= LINE_HEIGHT_BODY;
      let textBlockStartY = currentY;


      if (slide.content) {
        for (const block of slide.content) {
          if (currentY < (MARGIN + LINE_HEIGHT_BODY)) break;
          if (block.type === 'paragraph' && block.value) {
            const plainText = block.value.replace(/<[^>]*>|\*\*|\*/g, '');
            const paragraphLines = wrapText(plainText, customFont, FONT_SIZE_BODY, contentWidth);
            for (const line of paragraphLines) {
              if (currentY < (MARGIN + LINE_HEIGHT_BODY)) break;
              page.drawText(line, { x: MARGIN, y: currentY, font: customFont, size: FONT_SIZE_BODY, color: TEXT_COLOR });
              currentY -= LINE_HEIGHT_BODY;
            }
            currentY -= LINE_HEIGHT_BODY / 2;
          } else if (block.type === 'bullet_list' && block.items) {
            for (const item of block.items) {
              if (currentY < (MARGIN + LINE_HEIGHT_BODY)) break;
              const plainItem = item.replace(/<[^>]*>|\*\*|\*/g, '');
              const itemLines = wrapText(plainItem, customFont, FONT_SIZE_BODY, contentWidth - BULLET_INDENT);
              for (let i = 0; i < itemLines.length; i++) {
                if (currentY < (MARGIN + LINE_HEIGHT_BODY)) break;
                const prefix = i === 0 ? '•' : '';
                page.drawText(prefix, { x: MARGIN, y: currentY, font: customFont, size: FONT_SIZE_BODY, color: TEXT_COLOR });
                page.drawText(itemLines[i], { x: MARGIN + BULLET_INDENT, y: currentY, font: customFont, size: FONT_SIZE_BODY, color: TEXT_COLOR });
                currentY -= LINE_HEIGHT_BODY;
              }
            }
            currentY -= LINE_HEIGHT_BODY / 2;
          }
        }
      }


      if (slide.imageUrl) {
        try {
          const imageBuffer = await axios.get(slide.imageUrl, { responseType: 'arraybuffer' });
          let embeddedImage;
          if (slide.imageUrl.endsWith('.png')) {
            embeddedImage = await pdfDoc.embedPng(imageBuffer.data);
          } else {
            embeddedImage = await pdfDoc.embedJpg(imageBuffer.data);
          }
          const imageAspectRatio = embeddedImage.width / embeddedImage.height;
          const scaledHeight = imageWidth / imageAspectRatio;


          page.drawImage(embeddedImage, {
            x: imageStartX,
            y: textBlockStartY - scaledHeight,
            width: imageWidth,
            height: scaledHeight,
          });
        } catch (imgError) {
          console.error(`PDF için görsel yüklenemedi (Slide ${slide.slideNumber}):`, imgError.message);
        }
      }


      const pageNum = index + 1;
      const titleText = presentationData.title.substring(0, 70);

      page.drawText(titleText, { x: MARGIN, y: MARGIN / 2, size: FONT_SIZE_FOOTER, font: customFont, color: FOOTER_COLOR });

      const pageNumWidth = customFont.widthOfTextAtSize(`${pageNum}`, FONT_SIZE_FOOTER);
      page.drawText(`${pageNum}`, { x: width - MARGIN - pageNumWidth, y: MARGIN / 2, size: FONT_SIZE_FOOTER, font: customFont, color: FOOTER_COLOR });
    }

    // --- Kaynakça Sayfası ---
    const biblioPage = pdfDoc.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);
    const { width: biblioWidth, height: biblioHeight } = biblioPage.getSize();
    biblioPage.drawRectangle({ x: 0, y: 0, width: biblioWidth, height: biblioHeight, color: selectedTheme.bgColor.pdf });
    let biblioY = biblioHeight - MARGIN;

    biblioPage.drawText('Kaynakça', { x: MARGIN, y: biblioY, font: customBoldFont, size: 22, color: TITLE_COLOR });
    biblioY -= (LINE_HEIGHT_H1 + 10);

    for (const sourceObj of presentationData.bibliography) {
      const source = sourceObj.citation || '';
      const biblioLines = wrapText(source, customFont, 9, biblioWidth - MARGIN * 2);
      const requiredHeight = (biblioLines.length * 12) + 15;

      if (biblioY < MARGIN + requiredHeight) {

        const pageNum = presentationData.slides.length + 1;
        const titleText = presentationData.title.substring(0, 70);
        biblioPage.drawText(titleText, { x: MARGIN, y: MARGIN / 2, size: FONT_SIZE_FOOTER, font: customFont, color: FOOTER_COLOR });
        const pageNumWidth = customFont.widthOfTextAtSize(`${pageNum}`, FONT_SIZE_FOOTER);
        biblioPage.drawText(`${pageNum}`, { x: biblioWidth - MARGIN - pageNumWidth, y: MARGIN / 2, size: FONT_SIZE_FOOTER, font: customFont, color: FOOTER_COLOR });


        biblioPage = pdfDoc.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);
        biblioPage.drawRectangle({ x: 0, y: 0, width: biblioWidth, height: biblioHeight, color: selectedTheme.bgColor.pdf });
        biblioY = biblioHeight - MARGIN;
      }

      for (const line of biblioLines) {
        biblioPage.drawText(line, { x: MARGIN, y: biblioY, font: customFont, size: 9, color: TEXT_COLOR, lineHeight: 12 });
        biblioY -= 12;
      }
      biblioY -= 10;
    }


    const finalPageNum = pdfDoc.getPageCount();
    const titleText = presentationData.title.substring(0, 70);
    biblioPage.drawText(titleText, { x: MARGIN, y: MARGIN / 2, size: FONT_SIZE_FOOTER, font: customFont, color: FOOTER_COLOR });
    const pageNumWidth = customFont.widthOfTextAtSize(`${finalPageNum}`, FONT_SIZE_FOOTER);
    biblioPage.drawText(`${finalPageNum}`, { x: biblioWidth - MARGIN - pageNumWidth, y: MARGIN / 2, size: FONT_SIZE_FOOTER, font: customFont, color: FOOTER_COLOR });


    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sunum.pdf"');
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("PDF oluşturulurken hata oluştu:", error);
    res.status(500).json({ error: "PDF dosyası oluşturulamadı: " + error.message });
  }
});



app.post('/api/download-pptx', async (req, res) => {
  try {
    const { presentationData, theme: themeName } = req.body;
    const selectedTheme = getTheme(themeName);

    let pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';


    const standardTemplate = {
      masterTitle: 'STANDARD_MASTER',
      titleOptions: { x: 0.5, y: 0.2, w: '90%', h: 1.0, fontSize: 28, bold: true },
      contentOptions: { x: 0.5, y: 0.9, w: 5.0, h: 4.5 },
      imageOptions: { x: 6.0, y: 1.2, w: 3.5, h: 3.5 },
    };

    pptx.defineSlideMaster({
      title: standardTemplate.masterTitle,
      background: { color: selectedTheme.bgColor.pptx },
      objects: [
        { 'rect': { x: 0, y: '92%', w: '100%', h: '8%', fill: { color: selectedTheme.titleColor.pptx } } },
        { 'text': { text: presentationData.title, options: { x: 0.5, y: '94%', w: '90%', color: selectedTheme.bgColor.pptx, fontSize: 10, fontFace: 'Arial', valign: 'middle' } } }
      ]
    });

    let titleSlide = pptx.addSlide();
    titleSlide.addText(presentationData.title, {
      x: '5%', y: '40%', w: '90%', fontSize: 48, bold: true,
      color: selectedTheme.titleColor.pptx, align: 'center', fontFace: 'Arial'
    });

    for (const slide of presentationData.slides) {

      let pptxSlide = pptx.addSlide({ masterName: standardTemplate.masterTitle });

      pptxSlide.addText(slide.title, {
        ...standardTemplate.titleOptions,
        color: selectedTheme.titleColor.pptx,
        fontFace: 'Arial',
        valign: 'top'
      });

      const contentForSlide = [];

      if (slide.content && Array.isArray(slide.content)) {
        slide.content.forEach(block => {
          if (block.type === 'paragraph' && block.value) {
            const richTextParagraph = htmlToPptx(block.value);
            richTextParagraph.push({ text: '\n', options: { fontSize: 5.5, paraSpaceAfter: 5 } });
            contentForSlide.push(...richTextParagraph);
          }
          else if (block.type === 'bullet_list' && Array.isArray(block.items)) {
            block.items.forEach(item => {
              const isMainBullet = item.includes('**');
              const richTextItem = htmlToPptx(item);

              richTextItem.forEach(part => {
                part.options = {
                  ...part.options,
                  bullet: true,
                  paraSpaceAfter: isMainBullet ? 6 : 4,
                  indentLevel: isMainBullet ? 0 : 1
                };
              });
              contentForSlide.push(...richTextItem);
            });
          }
        });
      }

      if (contentForSlide.length > 0) {
        
        pptxSlide.addText(contentForSlide, {
          ...standardTemplate.contentOptions,
          fontSize: 10.5,
          fontFace: 'Arial',
          color: selectedTheme.textColor.pptx,
          lineSpacing: 11.5,
          fit: 'shrink'
        });
      }

      if (slide.imageUrl) {
        try {
          const imageResponse = await axios.get(slide.imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
          const contentType = imageResponse.headers['content-type'];
          const imageBase64 = Buffer.from(imageResponse.data).toString('base64');

          pptxSlide.addImage({
            data: `data:${contentType};base64,${imageBase64}`,
            ...standardTemplate.imageOptions,
            sizing: { type: 'contain', w: standardTemplate.imageOptions.w, h: standardTemplate.imageOptions.h }
          });
        } catch (imgError) {
          console.error(`Görsel ekleme hatası (Slide ${slide.slideNumber}):`, imgError.message);
        }
      }

      if (slide.notes) {
        pptxSlide.addNotes(slide.notes);
      }
    }

    let biblioSlide = pptx.addSlide({ masterName: standardTemplate.masterTitle });
    biblioSlide.addText("Kaynakça", { x: 0.5, y: 0.25, w: '90%', h: 0.75, fontSize: 32, bold: true, color: selectedTheme.titleColor.pptx, fontFace: 'Arial' });
    const biblioItems = presentationData.bibliography.map(sourceObj => sourceObj.citation || '');
    biblioSlide.addText(biblioItems.join('\n\n'), { x: 0.5, y: 1.25, w: '90%', h: '75%', fontSize: 9, color: selectedTheme.textColor.pptx, fontFace: 'Arial', valign: 'top' });

    const pptxBuffer = await pptx.write('nodebuffer');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', 'attachment; filename="sunum.pptx"');
    res.send(pptxBuffer);

  } catch (error) {
    console.error("PPTX oluşturulurken hata oluştu:", error);
    res.status(500).json({ error: "PPTX dosyası oluşturulamadı." });
  }
});

// --- SUNUCUYU BAŞLATMA ---
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});