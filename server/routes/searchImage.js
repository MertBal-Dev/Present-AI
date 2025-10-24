const express = require('express');
const router = express.Router();


const { smartImageSearch } = require('../services/imageService');

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


module.exports = router;
