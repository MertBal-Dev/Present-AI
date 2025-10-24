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

    
    console.log('[ImageSearch] Starting...');
    
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const imageKeywords = slide?.imageKeywords;
      
      if (!imageKeywords?.query) {
        console.warn(`[ImageSearch] Slide ${i + 1}: No query`);
        slide.imageUrl = null;
        continue;
      }

      try {
        console.log(`[ImageSearch] Slide ${i + 1}/${slides.length}: "${imageKeywords.query}"`);
        
        const imageUrl = await smartImageSearch({
          query: imageKeywords.query,
          queryEnglish: imageKeywords.queryEnglish || imageKeywords.query,
          context: imageKeywords.context || slide.title
        });
        
        if (imageUrl) {
          slide.imageUrl = imageUrl;
          console.log(`[ImageSearch] ✓ Slide ${i + 1} found`);
        } else {
          slide.imageUrl = null;
          console.warn(`[ImageSearch] ✗ Slide ${i + 1} not found`);
        }
        
      } catch (error) {
        console.error(`[ImageSearch] Slide ${i + 1} error:`, error.message);
        slide.imageUrl = null;
      }
      
      
      await delay(500);
    }

    const imagesFound = slides.filter(s => s.imageUrl).length;
    console.log(`\n[ImageSearch] Complete: ${imagesFound}/${slides.length} images found\n`);

    
    console.log('[ImageAnalysis] Calculating basic scores...');
    
    for (const slide of slides) {
      if (slide.imageUrl) {
        
        const query = (slide.imageKeywords?.query || '').toLowerCase();
        const url = slide.imageUrl.toLowerCase();
        
        let score = 50; 
        
        
        const queryWords = query.split(/\s+/).filter(w => w.length > 3);
        for (const word of queryWords) {
          if (url.includes(word)) {
            score += 10;
          }
        }
        
        
        if (url.includes('wikimedia.org')) {
          score += 10;
        }
        
        slide.finalImageRelevanceScore = Math.min(score, 100);
        console.log(`[ImageAnalysis] Slide ${slide.slideNumber}: Score=${slide.finalImageRelevanceScore}`);
      } else {
        slide.finalImageRelevanceScore = 0;
      }
    }
    
    console.log('[ImageAnalysis] Complete\n');

    
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
      highQualityImages: slides.filter(s => s.finalImageRelevanceScore >= 70).length,
      mediumQualityImages: slides.filter(s => s.finalImageRelevanceScore >= 50 && s.finalImageRelevanceScore < 70).length,
      lowQualityImages: slides.filter(s => s.finalImageRelevanceScore < 50 && s.imageUrl).length,
      missingImages: slides.filter(s => !s.imageUrl).length,
      avgImageScore: Math.round(
        slides.filter(s => s.imageUrl).reduce((sum, s) => sum + (s.finalImageRelevanceScore || 0), 0) / 
        Math.max(slides.filter(s => s.imageUrl).length, 1)
      )
    };
    
    presentationData.imageStats = stats;
    
    console.log('[Stats] Image Quality:');
    console.log(`  High (70+):     ${stats.highQualityImages}`);
    console.log(`  Medium (50-69): ${stats.mediumQualityImages}`);
    console.log(`  Low (<50):      ${stats.lowQualityImages}`);
    console.log(`  Missing:        ${stats.missingImages}`);
    console.log(`  Avg Score:      ${stats.avgImageScore}/100\n`);

    
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