const express = require('express');
const router = express.Router();
const { buildPPTX } = require('../services/pptxService');

router.post('/download-pptx', async (req, res) => {
  try {
    const { presentationData, theme: themeName } = req.body;
    const pptxBuffer = await buildPPTX(presentationData, themeName);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', 'attachment; filename="sunum.pptx"');
    res.send(pptxBuffer);
  } catch (error) {
    console.error('PPTX oluşturulurken hata oluştu:', error);
    res.status(500).json({ error: 'PPTX dosyası oluşturulamadı.' });
  }
});

module.exports = router;
