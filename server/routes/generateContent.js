const express = require('express');
const router = express.Router();

const {
  getCache,
  setCache,
  generatePresentation,
  visionRelevanceScore,
  extractImageMetaKeywords,
  computeKeywordSimilarityScore,
  validateInlineCitations,
  validateBibliographyURLs,
  autoRankSlides,
} = require('../services/aiService');

const {
  tryWikimediaWithBackoff,
  searchGoogleImages,
  searchPexelsImages,
  validateImageQuality,
} = require('../services/imageService');


router.post('/generate-content', async (req, res) => {
  let rawTextFromAI = '';
  try {
    const { topic, language } = req.body;
    if (!topic) return res.status(400).json({ error: 'Konu gerekli.' });

    const cached = getCache(topic, language);
    if (cached) {
      console.log(`[Cache] Önceden oluşturulmuş içerik döndürülüyor: "${topic}" (${language})`);
      return res.json(cached);
    }

    const unsafe = /(<script|<\/script>|@everyone|file:\/|bash -c|rm -rf|\bSYSTEM:|\bIgnore all\b)/i;
    if (unsafe.test(topic)) {
      return res.status(400).json({ error: 'Geçersiz konu girdisi.' });
    }

    const { presentationData, rawTextFromAI: rawText } = await generatePresentation(topic, language);
    rawTextFromAI = rawText;






    // --- Görsel Arama: Kademeli ve Toplu ---
    const slides = Array.isArray(presentationData.slides) ? presentationData.slides : [];


    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    const wikiStage = [];
    for (const slide of slides) {
      const q = slide?.imageKeywords?.query?.trim();
      if (!q) {
        wikiStage.push(null);
        continue;
      }
      try {
        const url = await tryWikimediaWithBackoff(q);
        wikiStage.push(url);
      } catch {
        wikiStage.push(null);
      }
      await delay(100);
    }


    const googleStage = await Promise.all(slides.map(async (s, i) => {
      if (wikiStage[i]) return wikiStage[i];
      const q = s?.imageKeywords?.query?.trim();
      if (!q) return null;
      try {
        const url = await searchGoogleImages(q, 1);
        return (url && await validateImageQuality(url)) ? url : null;
      } catch (err) {
        console.warn(`[Google] Hata: ${err.message}`);
        return null;
      }
    }));


    const finalStage = await Promise.all(slides.map(async (s, i) => {
      if (wikiStage[i]) return wikiStage[i];
      if (googleStage[i]) return googleStage[i];
      const q = s?.imageKeywords?.query?.trim();
      if (!q) return null;
      try {
        const url = await searchPexelsImages(q, 1);
        return (url && await validateImageQuality(url)) ? url : null;
      } catch { return null; }
    }));


    slides.forEach((slide, i) => {
      slide.imageUrl = wikiStage[i] || googleStage[i] || finalStage[i] || null;
    });

    // --- Görsel Uygunluk Analizi (Vision Auto-Ranker) ---
    const imageAnalysisCache = new Map();
    for (const slide of slides) {
      if (!slide.imageUrl || !slide.imageKeywords?.query) continue;
      const cacheKey = `${slide.imageUrl}_${slide.imageKeywords.query}`;
      if (imageAnalysisCache.has(cacheKey)) {
        const cached = imageAnalysisCache.get(cacheKey);
        slide.visionRelevanceScore = cached.visionRelevanceScore;
        slide.keywordSimilarityScore = cached.keywordSimilarityScore;
        slide.finalImageRelevanceScore = cached.finalImageRelevanceScore;
        continue;
      }
      const visionScore = await visionRelevanceScore(slide.imageKeywords.query, slide.imageUrl);
      const metaText = await extractImageMetaKeywords(slide.imageUrl);
      const keywordScore = await computeKeywordSimilarityScore(slide.imageKeywords.query, metaText);
      const finalScore = Math.round((visionScore + keywordScore) / 2);
      slide.visionRelevanceScore = visionScore;
      slide.keywordSimilarityScore = keywordScore;
      slide.finalImageRelevanceScore = finalScore;
      imageAnalysisCache.set(cacheKey, {
        visionRelevanceScore: visionScore,
        keywordSimilarityScore: keywordScore,
        finalImageRelevanceScore: finalScore,
      });
      console.log(`[LazyImage] ${slide.title} | Vision: ${visionScore} | Keyword: ${keywordScore} | Final: ${finalScore}`);
    }

    // --- Inline citation ve kaynak doğrulama kontrolleri ---
    const missingRefs = validateInlineCitations(presentationData);
    if (missingRefs.length > 0) {
      console.warn(`[Kaynakça] Eşleşmeyen ${missingRefs.length} atıf bulundu:`, missingRefs);
      presentationData.validationWarnings = { missingCitations: missingRefs };
    }

    // --- Bibliography URL doğrulaması ---
    const bibChecks = await validateBibliographyURLs(presentationData);
    const invalidURLs = bibChecks.filter(r => !r.ok);
    if (invalidURLs.length > 0) {
      console.warn(`[Kaynakça] ${invalidURLs.length} erişilemeyen bağlantı bulundu.`);
      presentationData.validationWarnings = {
        ...presentationData.validationWarnings,
        brokenLinks: invalidURLs,
      };
    }

    // --- Auto-ranker ---
    const slideScores = autoRankSlides(presentationData);
    presentationData.slideRankings = slideScores;
    const avgScore = slideScores.reduce((a, b) => a + b.score, 0) / slideScores.length;
    presentationData.presentationScore = Math.round(avgScore);
    console.log(`[AutoRanker] Ortalama sunum skoru: ${presentationData.presentationScore}`);

    setCache(topic, language, presentationData);
    console.log(`[Cache] Yeni sonuç belleğe alındı: "${topic}" (${language})`);

    res.json(presentationData);
  } catch (error) {
    console.error('Sunum içeriği oluşturulurken hata:', error.message);
    if (rawTextFromAI) console.error('AI ham metin:', rawTextFromAI);
    res.status(500).json({ error: 'Sunum oluşturulamadı. Lütfen konuyu değiştirip tekrar deneyin.' });
  }
});

module.exports = router;

