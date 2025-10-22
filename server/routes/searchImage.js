const express = require('express');
const router = express.Router();

const {
  smartImageSearch,
  clearCacheForQuery
} = require('../services/imageService');

const { normalizeQuery } = require('../services/aiService'); 



router.post('/search-image', async (req, res) => {
  try {
    let { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Sorgu gerekli.' });

    
    query = normalizeQuery(query);

    console.log(`\n[SmartImage] Başlatılıyor: "${query}"`);

    
    const result = await smartImageSearch(query);

    if (!result || !result.imageUrl) {
      console.warn(`[SmartImage] Uygun görsel bulunamadı: "${query}"`);
      return res.status(404).json({
        message: 'Uygun görsel bulunamadı. Lütfen farklı bir sorgu deneyin.'
      });
    }

    console.log(`[SmartImage] ✓ Görsel bulundu: ${result.imageUrl}`);

    
    return res.json({
      success: true,
      query,
      imageUrl: result.imageUrl,
      source: result.source || 'unknown',
      score: result.score || null
    });

  } catch (error) {
    console.error(`[SmartImage] Hata: ${error.message}`);
    return res.status(500).json({ error: 'Görsel araması başarısız oldu.' });
  }
});



router.post('/clear-image-cache', (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query gerekli.' });
    }

    const cleared = clearCacheForQuery(query);
    if (cleared) {
      console.log(`[ClearCache] ✓ Cache cleared for: "${query}"`);
      res.json({ success: true, message: `Cache temizlendi: ${query}` });
    } else {
      console.log(`[ClearCache] ℹ️ No cache found for: "${query}"`);
      res.json({ success: true, message: 'Cache bulunamadı (zaten temiz)' });
    }
  } catch (error) {
    console.error('[ClearCache] Error:', error);
    res.status(500).json({ error: 'Cache temizleme başarısız oldu.' });
  }
});

module.exports = router;
