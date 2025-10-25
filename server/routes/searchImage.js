const express = require('express');
const router = express.Router();

const { smartImageSearch, clearCacheForQuery } = require('../services/imageService');

// Görsel arama endpoint'i
router.post('/search-image', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Sorgu gerekli.' });

    console.log(`\n[SmartImage] Başlatılıyor: "${query}"`);
    const imageUrl = await smartImageSearch(query);

    if (!imageUrl) {
      return res.status(404).json({
        message: 'Uygun görsel bulunamadı. Lütfen farklı bir sorgu deneyin.'
      });
    }

    return res.json({ imageUrl });
  } catch (error) {
    console.error(`[SmartImage] Hata: ${error.message}`);
    return res.status(500).json({ error: 'Görsel araması başarısız oldu.' });
  }
});

// 🔥 Cache temizleme endpoint'i
router.post('/clear-image-cache', (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query gerekli.' });
    }
    
    const cleared = clearCacheForQuery(query);
    
    if (cleared) {
      console.log(`[ClearCache] ✓ Cache cleared for: "${query}"`);
      res.json({ 
        success: true, 
        message: `Cache temizlendi: ${query}` 
      });
    } else {
      console.log(`[ClearCache] ℹ️ No cache found for: "${query}"`);
      res.json({ 
        success: true, 
        message: 'Cache bulunamadı (zaten temiz)' 
      });
    }
  } catch (error) {
    console.error('[ClearCache] Error:', error);
    res.status(500).json({ error: 'Cache temizleme başarısız oldu.' });
  }
});

module.exports = router;