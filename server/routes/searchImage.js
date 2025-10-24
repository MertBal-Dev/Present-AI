const express = require('express');
const router = express.Router();

const {
  searchGoogleImages,
  searchWikimediaImages,
  searchPexelsImages,
  validateImageQuality,
  buildSimplifiedQueries,
} = require('../services/imageService');


router.post('/search-image', async (req, res) => {
  try {
    
    const { query, page = 1, nonce = '' } = req.body;
    if (!query) return res.status(400).json({ error: 'Sorgu gerekli.' });

    console.log(`\n[ImageSearch] Başlatılıyor: "${query}" (page ${page}) nonce=${nonce}`);

    // ---- Wikimedia Deneme ----
const simplifiedQueries = buildSimplifiedQueries(query);

    let imageUrl = null;

    for (let i = 0; i < simplifiedQueries.length; i++) {
      const q = simplifiedQueries[i].trim();
      if (!q) continue;
      
      console.log(`[ImageSearch] Wikimedia (${i + 1}. deneme): "${q}"`);
      const wikiUrl = await searchWikimediaImages(q, nonce); 
      if (wikiUrl && await validateImageQuality(wikiUrl)) {
        imageUrl = wikiUrl;
        console.log(`[OK] Wikimedia sonucu bulundu (${i + 1}. deneme): ${wikiUrl}`);
        break;
      } else {
        console.log(`[X] Wikimedia başarısız (${i + 1}. deneme): ${q}`);
      }
    }

    // ---- Google API (Minimum Kullanım) ----
    if (!imageUrl) {
      console.log(`[ImageSearch] Google API deneniyor: "${query}"`);
      try {
        const googleUrl = await searchGoogleImages(query, page, nonce); 
        if (googleUrl && await validateImageQuality(googleUrl)) {
          imageUrl = googleUrl;
          console.log(`[OK] Google sonucu bulundu: ${googleUrl}`);
        } else {
          console.log(`[X] Google sonucu bulunamadı.`);
        }
      } catch (error) {
        console.warn(`[Google API Hatası] ${error.message}`);
        if (error.message.includes('Quota')) {
          console.warn(`[Google] Kota dolmuş olabilir.`);
        }
      }
    }

    // ---- Pexels Fallback ----
    if (!imageUrl) {
      console.log(`[ImageSearch] Pexels fallback başlatılıyor: "${query}"`);
      const pexelsUrl = await searchPexelsImages(query, page, nonce); 
      if (pexelsUrl && await validateImageQuality(pexelsUrl)) {
        imageUrl = pexelsUrl;
        console.log(`[OK] Pexels sonucu bulundu: ${pexelsUrl}`);
      } else {
        console.log(`[X] Pexels'te de sonuç bulunamadı.`);
      }
    }

    // ---- Sonuç Döndür ----
    if (imageUrl) {
      return res.json({ imageUrl });
    } else {
      return res.status(404).json({
        imageUrl: null,
        message: 'Kaliteli görsel bulunamadı. Lütfen farklı bir konu deneyin.'
      });
    }

  } catch (error) {
    console.error(`[ImageSearch] Genel hata: ${error.message}`);
    return res.status(500).json({ error: 'Görsel araması başarısız oldu.' });
  }
});

module.exports = router;
