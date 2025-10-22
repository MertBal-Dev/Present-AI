const express = require('express');
const router = express.Router();

const {
  getCache,
  setCache,
  generatePresentation,
  validateInlineCitations,
  validateBibliographyURLs,
  autoRankSlides,

} = require('../services/aiService');

const { 
  smartImageSearch, 
  resetPresentationImages  
} = require('../services/imageService');

router.post('/generate-content', async (req, res) => {
  let rawTextFromAI = '';
  try {
    const { topic, language } = req.body;
    if (!topic) return res.status(400).json({ error: 'Konu gerekli.' });

    const cached = getCache(topic, language);
    if (cached) {
      console.log(`[Cache] ✓ Cached result returned: "${topic}"`);
      return res.json(cached);
    }

    const unsafe = /(<script|<\/script>|@everyone|file:\/|bash -c|rm -rf|\bSYSTEM:|\bIgnore all\b)/i;
    if (unsafe.test(topic)) {
      return res.status(400).json({ error: 'Geçersiz konu girdisi.' });
    }

    console.log(`\n[Generate] Starting presentation: "${topic}"`);
    
    resetPresentationImages();
    console.log('[ImageService] Image history reset for new presentation\n');
    
    const startTime = Date.now();

    const { presentationData, rawTextFromAI: rawText } = await generatePresentation(topic, language);
    rawTextFromAI = rawText;

    const slides = Array.isArray(presentationData.slides) ? presentationData.slides : [];


    const CONCURRENCY = 3;
    const resolvedImageUrls = new Array(slides.length).fill(null);

    let inFlight = 0;
    let cursor = 0;

    async function runNext() {
      if (cursor >= slides.length) return;
      const idx = cursor++;
      const slide = slides[idx];
      const imageKeywords = slide?.imageKeywords;

      if (!imageKeywords?.query) {
        console.warn(`[ImageSearch] Slide ${idx + 1} (No query): Skipping`);
        resolvedImageUrls[idx] = null;
        return runNext();
      }

      inFlight++;
      console.log(`[ImageSearch] Starting job ${idx + 1}/${slides.length}: "${imageKeywords.query}"`);

      try {
        const result = await smartImageSearch({
          query: imageKeywords.query,
          queryEnglish: imageKeywords.queryEnglish || imageKeywords.query,
          context: imageKeywords.context || slide.title
        });
        resolvedImageUrls[idx] = result || null;
      } catch (e) {
        resolvedImageUrls[idx] = null;
      } finally {
        inFlight--;
        if (cursor < slides.length) {
          await runNext();
        }
      }
    }

    
    const starters = [];
    for (let i = 0; i < Math.min(CONCURRENCY, slides.length); i++) {
      starters.push(runNext());
    }
    await Promise.all(starters);


    resolvedImageUrls.forEach((result, index) => {
      if (!result) {
        slides[index].imageUrl = null;
        return;
      }


      const { imageUrl, source, score } = result;

      slides[index].imageUrl = imageUrl;
      slides[index].imageSource = source || 'unknown';
      slides[index].imageScore = score || 0;

      if (imageUrl) {
        console.log(`[ImageSearch] ✓ Slide ${index + 1} found (${source}, ${score || '?'} pts)`);
      } else {
        console.warn(`[ImageSearch] ✗ Slide ${index + 1} NOT found`);
      }
    });


    const imagesFound = slides.filter(s => s.imageUrl).length;
    console.log(`\n[ImageSearch] Complete: ${imagesFound}/${slides.length} images found\n`);


    slides.forEach((slide) => {
      if (!slide.finalImageRelevanceScore) {
        slide.finalImageRelevanceScore = 0;
      }
    });

    console.log('[ImageAnalysis] Skipped to improve response time.\n');


    console.log('[Validation] Checking citations...');
    const missingRefs = validateInlineCitations(presentationData);
    if (missingRefs.length > 0) {
      console.warn(`[Validation] ${missingRefs.length} unmatched citations`);
      presentationData.validationWarnings = { missingCitations: missingRefs };
    }

    console.log('[Validation] Checking bibliography URLs...');
    const bibChecks = await validateBibliographyURLs(presentationData);
    const invalidURLs = bibChecks.filter(r => !r.ok);
    if (invalidURLs.length > 0) {
      console.warn(`[Validation] ${invalidURLs.length} broken links`);
      presentationData.validationWarnings = {
        ...presentationData.validationWarnings,
        brokenLinks: invalidURLs,
      };
    }
    console.log('[Validation] Complete\n');

    console.log('[AutoRank] Calculating scores...');
    const slideScores = autoRankSlides(presentationData);
    presentationData.slideRankings = slideScores;
    const avgScore = slideScores.reduce((a, b) => a + b.score, 0) / slideScores.length;
    presentationData.presentationScore = Math.round(avgScore);
    console.log(`[AutoRank] Average score: ${presentationData.presentationScore}/100\n`);


    const stats = {
      totalSlides: slides.length,
      imagesFound: slides.filter(s => s.imageUrl).length,
      missingImages: slides.filter(s => !s.imageUrl).length,
    };
    presentationData.imageStats = stats;

    console.log('[Stats] Image Report:');
    console.log(`  Images Found: ${stats.imagesFound}/${stats.totalSlides}`);
    console.log(`  Missing:      ${stats.missingImages}\n`);


    const summaryMessage = `Sunum hazırlandı. ${stats.totalSlides} slayttan ${stats.imagesFound} tanesi için görsel bulundu.`;
    presentationData.summaryMessage = summaryMessage;
    console.log(summaryMessage + "\n");

    const elapsedMs = Date.now() - startTime;
    presentationData.generationTimeMs = elapsedMs;
    presentationData.generationTimeHuman = `${(elapsedMs / 1000 / 60).toFixed(2)} dakika`;
    console.log(`[Timing] Total generation time: ${(elapsedMs / 1000 / 60).toFixed(2)} dakika`);


    setCache(topic, language, presentationData);
    console.log(`[Cache] ✓ Result cached\n`);

    res.json(presentationData);

  } catch (error) {
    console.error('\n[ERROR] Presentation failed:', error.message);
    if (rawTextFromAI) {
      console.error('[DEBUG] AI response:', rawTextFromAI.substring(0, 300));
    }
    res.status(500).json({
      error: 'Sunum oluşturulamadı. Lütfen tekrar deneyin.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;