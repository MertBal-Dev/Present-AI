const axios = require('axios');
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');


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

const themes = {
  default: {
    bgColor: { pptx: 'FFFFFF' },
    titleColor: { pptx: '00529B' },
    textColor: { pptx: '1A1A1A' },
  },
  dark: {
    bgColor: { pptx: '282C34' },
    titleColor: { pptx: '61DAFB' },
    textColor: { pptx: 'E6E6E6' },
  },
  corporate: {
    bgColor: { pptx: 'F5F5F5' },
    titleColor: { pptx: 'D9534F' },
    textColor: { pptx: '333333' },
  },
  forest: {
    bgColor: { pptx: 'FCFCF5' },
    titleColor: { pptx: '336633' },
    textColor: { pptx: '404040' },
  },
};

const getTheme = (themeName) => themes[themeName] || themes.default;



async function getImageBufferSafe(imageUrl) {
  try {
    
    if (imageUrl && imageUrl.startsWith('data:image')) {
      console.log(`[PPTX] Base64 görsel verisi işleniyor...`);
      const mimeTypeMatch = imageUrl.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
      if (!mimeTypeMatch) {
        throw new Error('Geçersiz Base64 URI formatı.');
      }
      const mimeType = mimeTypeMatch[1];
      const base64Data = imageUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      return { buffer: buffer, mime: mimeType };
    }
    
    
    console.log(`[PPTX] Harici URL indiriliyor: ${imageUrl}`);
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://www.google.com/',
      },
      validateStatus: (status) => status < 500,
    });

    if (!response.data || response.status >= 400) {
      throw new Error(`HTTP ${response.status} — Görsel indirilemedi`);
    }

    const contentType = response.headers['content-type'] || 'image/jpeg';
    return { buffer: response.data, mime: contentType };
  } catch (err) {
    
    const urlSnippet = typeof imageUrl === 'string' ? imageUrl.substring(0, 70) + '...' : 'Bilinmeyen URL';
    console.error(`[PPTX] Görsel indirilemedi: ${urlSnippet} (${err.message})`);
    return { buffer: null, mime: null };
  }
}


async function buildPPTX(presentationData, themeName) {
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
      { rect: { x: 0, y: '92%', w: '100%', h: '8%', fill: { color: selectedTheme.titleColor.pptx } } },
      { text: { text: presentationData.title, options: { x: 0.5, y: '94%', w: '90%', color: selectedTheme.bgColor.pptx, fontSize: 10, fontFace: 'Arial', valign: 'middle' } } }
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
        } else if (block.type === 'bullet_list' && Array.isArray(block.items)) {
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
        fontSize: 9.5,
        fontFace: 'Arial',
        color: selectedTheme.textColor.pptx,
        lineSpacing: 10.5,
        fit: 'shrink'
      });
    }

if (slide.imageUrl) {
  try {
    const { buffer, mime } = await getImageBufferSafe(slide.imageUrl);
    if (!buffer) {
      console.warn(`[PPTX] Görsel atlandı (Slide ${slide.slideNumber})`);
      continue;
    }

    const processedBuffer = (mime || '').includes('png')
      ? await sharp(buffer).rotate().png().toBuffer()
      : await sharp(buffer).rotate().jpeg({ quality: 85 }).toBuffer();

    const imageBase64 = processedBuffer.toString('base64');
    pptxSlide.addImage({
      data: `data:${mime};base64,${imageBase64}`,
      ...standardTemplate.imageOptions,
      sizing: { type: 'contain', w: standardTemplate.imageOptions.w, h: standardTemplate.imageOptions.h },
    });
  } catch (err) {
    console.error(`[PPTX] Görsel ekleme hatası (Slide ${slide.slideNumber}):`, err.message);
  }
}






    if (slide.notes) {
      pptxSlide.addNotes(slide.notes);
    }
  }

  let biblioSlide = pptx.addSlide({ masterName: standardTemplate.masterTitle });
  biblioSlide.addText('Kaynakça', { x: 0.5, y: 0.25, w: '90%', h: 0.75, fontSize: 32, bold: true, color: selectedTheme.titleColor.pptx, fontFace: 'Arial' });
  const biblioItems = presentationData.bibliography.map(sourceObj => sourceObj.citation || '');
  biblioSlide.addText(biblioItems.join('\n\n'), { x: 0.5, y: 1.25, w: '90%', h: '75%', fontSize: 9, color: selectedTheme.textColor.pptx, fontFace: 'Arial', valign: 'top' });

  const pptxBuffer = await pptx.write('nodebuffer');
  return pptxBuffer;
}

module.exports = { buildPPTX };

