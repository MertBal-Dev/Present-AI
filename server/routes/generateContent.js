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

const { smartImageSearch } = require('../services/imageService');

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
    const { presentationData, rawTextFromAI: rawText } = await generatePresentation(topic, language);
    rawTextFromAI = rawText;

    const slides = Array.isArray(presentationData.slides) ? presentationData.slides : [];
    console.log(`[Generate] ${slides.length} slides created\n`);

    console.log('[ImageSearch] Starting parallel batch processing...');
    const searchPromises = slides.map((slide, index) => {
      const imageKeywords = slide?.imageKeywords;
      if (!imageKeywords?.query) {
        console.warn(`[ImageSearch] Slide ${index + 1} (No query): Skipping`);
        return Promise.resolve(null);
      }
      console.log(`[ImageSearch] Starting job ${index + 1}/${slides.length}: "${imageKeywords.query}"`);
      return smartImageSearch({
        query: imageKeywords.query,
        queryEnglish: imageKeywords.queryEnglish || imageKeywords.query,
        context: imageKeywords.context || slide.title
      }).catch(error => {
        console.error(`[ImageSearch] ✗ Slide ${index + 1} failed: "${imageKeywords.query}"`, error.message);
        return null;
      });
    });

    const resolvedImageUrls = await Promise.all(searchPromises);
    resolvedImageUrls.forEach((imageUrl, index) => {
      slides[index].imageUrl = imageUrl;
      if (imageUrl) {
        console.log(`[ImageSearch] ✓ Slide ${index + 1} found`);
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