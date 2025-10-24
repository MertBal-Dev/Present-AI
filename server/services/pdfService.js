const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const fontkit = require('fontkit');
const { PDFDocument, rgb } = require('pdf-lib');


let mainFontBytes = null;
let boldFontBytes = null;
try {
  mainFontBytes = fs.readFileSync(path.join(__dirname, '..', 'fonts', 'NotoSans-Regular.ttf'));
  boldFontBytes = fs.readFileSync(path.join(__dirname, '..', 'fonts', 'NotoSans-Bold.ttf'));
  console.log('TTF font dosyaları başarıyla belleğe yüklendi.');
} catch (error) {
  console.error('Kritik Hata: Font dosyaları yüklenemedi! PDF oluşturma özelliği çalışmayacaktır.', error.message);
}

const themes = {
  default: {
    bgColor: { pdf: rgb(1, 1, 1), pptx: 'FFFFFF' },
    titleColor: { pdf: rgb(0, 0.32, 0.61), pptx: '00529B' },
    textColor: { pdf: rgb(0.1, 0.1, 0.1), pptx: '1A1A1A' },
  },
  dark: {
    bgColor: { pdf: rgb(0.16, 0.17, 0.2), pptx: '282C34' },
    titleColor: { pdf: rgb(0.38, 0.85, 0.98), pptx: '61DAFB' },
    textColor: { pdf: rgb(0.9, 0.9, 0.9), pptx: 'E6E6E6' },
  },
  corporate: {
    bgColor: { pdf: rgb(0.96, 0.96, 0.96), pptx: 'F5F5F5' },
    titleColor: { pdf: rgb(0.85, 0.33, 0.31), pptx: 'D9534F' },
    textColor: { pdf: rgb(0.2, 0.2, 0.2), pptx: '333333' },
  },
  forest: {
    bgColor: { pdf: rgb(0.98, 0.98, 0.96), pptx: 'FCFCF5' },
    titleColor: { pdf: rgb(0.2, 0.4, 0.2), pptx: '336633' },
    textColor: { pdf: rgb(0.25, 0.25, 0.25), pptx: '404040' },
  },
};

const getTheme = (themeName) => themes[themeName] || themes.default;

function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

async function buildPDF(presentationData, themeName) {
  const selectedTheme = getTheme(themeName);

  if (!mainFontBytes || !boldFontBytes) {
    throw new Error('Sunucu fontları belleğe yüklenemediği için PDF oluşturulamıyor.');
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const customFont = await pdfDoc.embedFont(mainFontBytes);
  const customBoldFont = await pdfDoc.embedFont(boldFontBytes);

  const A4_LANDSCAPE = { width: 841.89, height: 595.28 };
  const MARGIN = 57;

  const FONT_SIZE_H1 = 30;
  const FONT_SIZE_BODY = 16;
  const FONT_SIZE_FOOTER = 8;

  const LINE_HEIGHT_H1 = 35;
  const LINE_HEIGHT_BODY = 16;

  const BULLET_INDENT = 20;
  const COLUMN_GAP = 30;

  const TEXT_COLOR = selectedTheme.textColor.pdf;
  const TITLE_COLOR = selectedTheme.titleColor.pdf;
  const FOOTER_COLOR = rgb(0.5, 0.5, 0.5);

  for (const [index, slide] of presentationData.slides.entries()) {
    const page = pdfDoc.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);
    const { width, height } = page.getSize();
    page.drawRectangle({ x: 0, y: 0, width, height, color: selectedTheme.bgColor.pdf });

    const usableWidth = width - MARGIN * 2 - COLUMN_GAP;
    const contentWidth = usableWidth / 2;
    const imageWidth = usableWidth / 2;
    const imageStartX = MARGIN + contentWidth + COLUMN_GAP;

    let currentY = height - MARGIN;

    const titleLines = wrapText(slide.title, customBoldFont, FONT_SIZE_H1, contentWidth);
    for (const line of titleLines) {
      page.drawText(line, { x: MARGIN, y: currentY, font: customBoldFont, size: FONT_SIZE_H1, color: TITLE_COLOR });
      currentY -= LINE_HEIGHT_H1;
    }
    currentY -= LINE_HEIGHT_BODY;
    let textBlockStartY = currentY;

    if (slide.content) {
      for (const block of slide.content) {
        if (currentY < (MARGIN + LINE_HEIGHT_BODY)) break;
        if (block.type === 'paragraph' && block.value) {
          const plainText = block.value.replace(/<[^>]*>|\*\*|\*/g, '');
          const paragraphLines = wrapText(plainText, customFont, FONT_SIZE_BODY, contentWidth);
          for (const line of paragraphLines) {
            if (currentY < (MARGIN + LINE_HEIGHT_BODY)) break;
            page.drawText(line, { x: MARGIN, y: currentY, font: customFont, size: FONT_SIZE_BODY, color: TEXT_COLOR });
            currentY -= LINE_HEIGHT_BODY;
          }
          currentY -= LINE_HEIGHT_BODY / 2;
        } else if (block.type === 'bullet_list' && block.items) {
          for (const item of block.items) {
            if (currentY < (MARGIN + LINE_HEIGHT_BODY)) break;
            const plainItem = item.replace(/<[^>]*>|\*\*|\*/g, '');
            const itemLines = wrapText(plainItem, customFont, FONT_SIZE_BODY, contentWidth - BULLET_INDENT);
            for (let i = 0; i < itemLines.length; i++) {
              if (currentY < (MARGIN + LINE_HEIGHT_BODY)) break;
              const prefix = i === 0 ? '•' : '';
              page.drawText(prefix, { x: MARGIN, y: currentY, font: customFont, size: FONT_SIZE_BODY, color: TEXT_COLOR });
              page.drawText(itemLines[i], { x: MARGIN + BULLET_INDENT, y: currentY, font: customFont, size: FONT_SIZE_BODY, color: TEXT_COLOR });
              currentY -= LINE_HEIGHT_BODY;
            }
          }
          currentY -= LINE_HEIGHT_BODY / 2;
        }
      }
    }

if (slide.imageUrl) {
  try {
    
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

    const response = await fetchImageWithRetry(slide.imageUrl);
    const contentType = response.headers['content-type'];

    
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
      console.warn(`⚠️ Desteklenmeyen görsel tipi atlandı: ${contentType}`);
    } else {
      

let fixedBuffer = await sharp(response.data).rotate().toBuffer();


const noise = Buffer.from([Math.floor(Math.random() * 255)]);
fixedBuffer = Buffer.concat([fixedBuffer, noise]);

let embeddedImage;
if (contentType.includes('png')) {
  embeddedImage = await pdfDoc.embedPng(fixedBuffer);
} else {
  embeddedImage = await pdfDoc.embedJpg(fixedBuffer);
}

const imageAspectRatio = embeddedImage.width / embeddedImage.height;
const scaledHeight = imageWidth / imageAspectRatio;

page.drawImage(embeddedImage, {
  x: imageStartX,
  y: textBlockStartY - scaledHeight,
  width: imageWidth,
  height: scaledHeight,
});

    }
  } catch (imgError) {
    console.error(
      `PDF için görsel yüklenemedi (Slide ${slide.slideNumber}):`,
      imgError.response?.status || imgError.message
    );
  }
}




    const pageNum = index + 1;
    const titleText = presentationData.title.substring(0, 70);

    page.drawText(titleText, { x: MARGIN, y: MARGIN / 2, size: FONT_SIZE_FOOTER, font: customFont, color: FOOTER_COLOR });
    const pageNumWidth = customFont.widthOfTextAtSize(`${pageNum}`, FONT_SIZE_FOOTER);
    page.drawText(`${pageNum}`, { x: width - MARGIN - pageNumWidth, y: MARGIN / 2, size: FONT_SIZE_FOOTER, font: customFont, color: FOOTER_COLOR });
  }

  
  let biblioPage = pdfDoc.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);
  const { width: biblioWidth, height: biblioHeight } = biblioPage.getSize();
  biblioPage.drawRectangle({ x: 0, y: 0, width: biblioWidth, height: biblioHeight, color: selectedTheme.bgColor.pdf });
  let biblioY = biblioHeight - MARGIN;

  biblioPage.drawText('Kaynakça', { x: MARGIN, y: biblioY, font: customBoldFont, size: 22, color: TITLE_COLOR });
  biblioY -= (LINE_HEIGHT_H1 + 10);

  for (const sourceObj of presentationData.bibliography) {
    const source = sourceObj.citation || '';
    const biblioLines = wrapText(source, customFont, 9, biblioWidth - MARGIN * 2);
    const requiredHeight = (biblioLines.length * 12) + 15;

    if (biblioY < MARGIN + requiredHeight) {
      const pageNum = presentationData.slides.length + 1;
      const titleText = presentationData.title.substring(0, 70);
      biblioPage.drawText(titleText, { x: MARGIN, y: MARGIN / 2, size: FONT_SIZE_FOOTER, font: customFont, color: FOOTER_COLOR });
      const pageNumWidth = customFont.widthOfTextAtSize(`${pageNum}`, FONT_SIZE_FOOTER);
      biblioPage.drawText(`${pageNum}`, { x: biblioWidth - MARGIN - pageNumWidth, y: MARGIN / 2, size: FONT_SIZE_FOOTER, font: customFont, color: FOOTER_COLOR });

      biblioPage = pdfDoc.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);
      biblioPage.drawRectangle({ x: 0, y: 0, width: biblioWidth, height: biblioHeight, color: selectedTheme.bgColor.pdf });
      biblioY = biblioHeight - MARGIN;
    }

    for (const line of biblioLines) {
      biblioPage.drawText(line, { x: MARGIN, y: biblioY, font: customFont, size: 9, color: TEXT_COLOR, lineHeight: 12 });
      biblioY -= 12;
    }
    biblioY -= 10;
  }

  const finalPageNum = pdfDoc.getPageCount();
  const titleText = presentationData.title.substring(0, 70);
  biblioPage.drawText(titleText, { x: MARGIN, y: MARGIN / 2, size: FONT_SIZE_FOOTER, font: customFont, color: FOOTER_COLOR });
  const pageNumWidth = customFont.widthOfTextAtSize(`${finalPageNum}`, FONT_SIZE_FOOTER);
  biblioPage.drawText(`${finalPageNum}`, { x: biblioWidth - MARGIN - pageNumWidth, y: MARGIN / 2, size: FONT_SIZE_FOOTER, font: customFont, color: FOOTER_COLOR });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { buildPDF };
