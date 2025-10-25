const axios = require('axios');
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');

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
    
    const isLocalUpload = slide.imageUrl.includes('/uploads/');
    let imageBuffer, contentType;

    if (isLocalUpload) {
      const path = require('path');
      const fs = require('fs');
      const [, afterUploads] = slide.imageUrl.split('/uploads/');
      const localPath = path.join(__dirname, '..', 'public', 'uploads', afterUploads);
      console.log(`[PPTX] Yerel görsel okunuyor: ${localPath}`);

      if (!fs.existsSync(localPath)) throw new Error(`Yerel dosya bulunamadı: ${localPath}`);
      imageBuffer = fs.readFileSync(localPath);
      const ext = path.extname(localPath).slice(1).toLowerCase();
      contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    } else {
      
      const fetchImageWithRetry = async (url, attempts = 3) => {
        for (let i = 0; i < attempts; i++) {
          try {
            return await axios.get(url, {
              responseType: 'arraybuffer',
              timeout: 10000,
              maxRedirects: 5,
              headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': url },
            });
          } catch (error) {
            if (i === attempts - 1) throw error;
            await new Promise(r => setTimeout(r, 500));
          }
        }
      };

      const imageResponse = await fetchImageWithRetry(slide.imageUrl);
      imageBuffer = imageResponse.data;
      contentType = imageResponse.headers['content-type'] || 'image/jpeg';
    }

    
    let outBuf, mime;
    if ((contentType || '').includes('png')) {
      outBuf = await sharp(imageBuffer).rotate().png().toBuffer();
      mime = 'image/png';
    } else {
      outBuf = await sharp(imageBuffer).rotate().jpeg({ quality: 85 }).toBuffer();
      mime = 'image/jpeg';
    }

    const imageBase64 = outBuf.toString('base64');

    
    pptxSlide.addImage({
      data: `data:${mime};base64,${imageBase64}`,
      ...standardTemplate.imageOptions,
      sizing: { type: 'contain', w: standardTemplate.imageOptions.w, h: standardTemplate.imageOptions.h },
    });

  } catch (imgError) {
    console.error(
      `PPTX görsel yükleme hatası (Slide ${slide.slideNumber}):`,
      imgError.message
    );
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

