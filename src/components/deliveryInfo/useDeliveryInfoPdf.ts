/**
 * @file useDeliveryInfoPdf.ts
 * @description Hook za generiranje PDF dokumenta "Informacija o dostavnem mestu"
 * Uporablja template PDF in vpisuje podatke na določena mesta
 */

import { PDFDocument, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { DeliveryInfoFormData } from './types';

// Debug/calibration mode - set to true to show coordinate grid
const DEBUG_COORDINATES = false;

interface PdfHelpers {
  font: PDFFont;
  fontBold: PDFFont;
  height: number;
  fontSize: number;
}

// Helper za risanje teksta
function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  { font, height, fontSize }: PdfHelpers,
  size = fontSize
) {
  if (!text) return;
  page.drawText(text, {
    x,
    y: height - y,
    size,
    font,
    color: rgb(0, 0, 0),
  });
}

// Helper za tekst z prelomom vrstice
function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  { font, height, fontSize }: PdfHelpers,
  size = fontSize
): number {
  if (!text) return y;
  const words = text.split(' ');
  let currentLine = '';
  let currentY = y;

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = font.widthOfTextAtSize(testLine, size);

    if (textWidth > maxWidth && currentLine) {
      page.drawText(currentLine, {
        x,
        y: height - currentY,
        size,
        font,
        color: rgb(0, 0, 0),
      });
      currentLine = word;
      currentY += lineHeight;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    page.drawText(currentLine, {
      x,
      y: height - currentY,
      size,
      font,
      color: rgb(0, 0, 0),
    });
    currentY += lineHeight;
  }

  return currentY;
}

// Debug grid za kalibracijo koordinat
function drawDebugGrid(page: PDFPage, font: PDFFont, height: number, width: number) {
  const gridColor = rgb(1, 0, 0);

  for (let y = 0; y <= height; y += 25) {
    const isMajor = y % 50 === 0;
    page.drawLine({
      start: { x: 0, y: height - y },
      end: { x: width, y: height - y },
      thickness: isMajor ? 0.4 : 0.2,
      color: gridColor,
    });
    page.drawText(`${y}`, {
      x: 3,
      y: height - y + 2,
      size: 6,
      font,
      color: gridColor,
    });
  }

  for (let x = 0; x <= width; x += 25) {
    const isMajor = x % 50 === 0;
    page.drawLine({
      start: { x, y: 0 },
      end: { x, y: height },
      thickness: isMajor ? 0.4 : 0.2,
      color: gridColor,
    });
    if (x % 50 === 0) {
      page.drawText(`${x}`, {
        x: x + 2,
        y: height - 10,
        size: 6,
        font,
        color: gridColor,
      });
    }
  }
}

async function generateDeliveryInfoPdfInternal(formData: DeliveryInfoFormData): Promise<Blob> {
  // Load the PDF template
  const templateUrl = '/dostavno-mesto-template.pdf';
  const templateResponse = await fetch(templateUrl);
  const templateArrayBuffer = await templateResponse.arrayBuffer();

  const pdfDoc = await PDFDocument.load(templateArrayBuffer);
  pdfDoc.registerFontkit(fontkit);

  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const page2 = pages.length > 1 ? pages[1] : null;

  const { height, width } = page1.getSize();

  // Load fonts
  let font: PDFFont;
  let fontBold: PDFFont;

  try {
    const fontRegularResponse = await fetch('/fonts/Roboto-Regular.ttf');
    const fontRegularBytes = await fontRegularResponse.arrayBuffer();
    font = await pdfDoc.embedFont(fontRegularBytes);

    const fontBoldResponse = await fetch('/fonts/Roboto-Bold.ttf');
    const fontBoldBytes = await fontBoldResponse.arrayBuffer();
    fontBold = await pdfDoc.embedFont(fontBoldBytes);
  } catch (e) {
    const { StandardFonts } = await import('pdf-lib');
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  const fontSize = 10;
  const helpers: PdfHelpers = { font, fontBold, height, fontSize };

  if (DEBUG_COORDINATES) {
    drawDebugGrid(page1, font, height, width);
    if (page2) drawDebugGrid(page2, font, height, width);
  }

  // ============================================
  // STRAN 1 - Koordinate za polja
  // ============================================

  const leftMargin = 42;
  const lineHeight = 12;

  // 1. Prodajni zastopnik in njegov telefon : [INLINE]
  const salesRepY = 164; // 163 + 1
  const salesRepX = 325;
  // Combine name and phone with space - bold and 20% larger (10 * 1.2 = 12)
  const salesRepText = [formData.salesRep, formData.salesRepPhone].filter(Boolean).join(' ');
  if (salesRepText) {
    page1.drawText(salesRepText, {
      x: salesRepX,
      y: height - salesRepY,
      size: 12, // 20% larger
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  }

  // 2. Šifra dostavnega mesta (DC number) - BOLD
  const dcNumberY = 178; // 177 + 1
  const dcNumberX = 435;
  if (formData.customerNumber) {
    page1.drawText(formData.customerNumber, {
      x: dcNumberX,
      y: height - dcNumberY,
      size: fontSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  }

  // 3. Naziv in naslov dostavnega mesta: (3 lines below) - BOLD
  const addressStartY = 205;
  const addressX = 75;

  // Line 1: Street address - bold
  if (formData.address) {
    page1.drawText(formData.address, {
      x: addressX,
      y: height - addressStartY,
      size: fontSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  }

  // Line 2: Postal - bold
  if (formData.postal) {
    page1.drawText(formData.postal, {
      x: addressX,
      y: height - (addressStartY + lineHeight),
      size: fontSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  }

  // Line 3: City - bold
  if (formData.city) {
    page1.drawText(formData.city, {
      x: addressX,
      y: height - (addressStartY + lineHeight * 2),
      size: fontSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  }

  // 4. Kontaktna oseba za lokacijo
  const contact1NameY = 266; // 268 - 2
  const contact1NameX = 127; // 125 + 2
  drawText(page1, formData.contactName || '', contact1NameX, contact1NameY, helpers);

  const contact1PhoneY = 280; // 282 - 2
  const contact1PhoneX = 105;
  const contact1EmailY = 280; // 282 - 2
  const contact1EmailX = 338; // 335 + 3
  drawText(page1, formData.contactPhone || '', contact1PhoneX, contact1PhoneY, helpers);
  drawText(page1, formData.contactEmail || '', contact1EmailX, contact1EmailY, helpers);

  // 5. Morebiten drug kontakt za račune
  const contact2NameY = 317; // 320 - 3
  const contact2NameX = 127; // 125 + 2
  drawText(page1, formData.secondaryContactName || '', contact2NameX, contact2NameY, helpers);

  const contact2PhoneY = 344; // 342 + 2
  const contact2PhoneX = 106;
  const contact2EmailY = 342;
  const contact2EmailX = 342; // 339 + 3
  drawText(page1, formData.secondaryContactPhone || '', contact2PhoneX, contact2PhoneY, helpers);
  drawText(page1, formData.secondaryContactEmail || '', contact2EmailX, contact2EmailY, helpers);

  // 6. I. Predpražniki section

  // Popust: ___%
  const discountY = 387; // 385 + 2
  const discountX = 170; // 175 - 5
  if (formData.discount) {
    drawText(page1, formData.discount, discountX, discountY, helpers);
  }

  // Faza: DA / NE - underline the correct one
  const fazaY = 400;
  if (formData.hasPhase !== undefined) {
    const underlineY = height - fazaY - 2;
    if (formData.hasPhase) {
      // Underline DA
      page1.drawLine({
        start: { x: 90, y: underlineY },
        end: { x: 108, y: underlineY },
        thickness: 1.5,
        color: rgb(0, 0, 0),
      });
    } else {
      // Underline NE
      page1.drawLine({
        start: { x: 115, y: underlineY },
        end: { x: 130, y: underlineY },
        thickness: 1.5,
        color: rgb(0, 0, 0),
      });
    }
  }

  // Možnosti za razširitev (X=75, +5px dol)
  const expansionY = 463; // 458 + 5
  const expansionX = 75;
  if (formData.expansionNotes) {
    drawWrappedText(page1, formData.expansionNotes, expansionX, expansionY, 480, lineHeight, helpers, 9);
  }

  // Mesto namestitve predpražnika (X=75, +5px dol)
  const locationY = 500; // 495 + 5
  const locationX = 75;
  if (formData.locationDescription) {
    drawWrappedText(page1, formData.locationDescription, locationX, locationY, 480, lineHeight, helpers, 9);
  }

  // Dodatne opombe za voznika (X=75, +40px dol)
  const driverNotesY = 645; // 605 + 40
  const driverNotesX = 75;
  if (formData.driverNotes) {
    drawWrappedText(page1, formData.driverNotes, driverNotesX, driverNotesY, 480, lineHeight, helpers, 9);
  }

  // ============================================
  // STRAN 2 - Slike
  // ============================================
  if (formData.images && formData.images.length > 0) {
    // Use page2 if exists, otherwise create a new page for images
    let currentPage = page2 || pdfDoc.addPage([width, height]);
    let imageY = page2 ? 130 : 50; // Start below header on page2, or at top on new pages
    const maxImageHeight = 250;
    const maxImageWidth = 480;
    const imagePadding = 20;

    for (let i = 0; i < formData.images.length; i++) {
      const imageData = formData.images[i];

      try {
        let image;
        if (imageData.startsWith('data:image/png')) {
          const base64 = imageData.split(',')[1];
          const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          image = await pdfDoc.embedPng(bytes);
        } else if (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/jpg')) {
          const base64 = imageData.split(',')[1];
          const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          image = await pdfDoc.embedJpg(bytes);
        } else {
          try {
            const base64 = imageData.split(',')[1];
            const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            image = await pdfDoc.embedPng(bytes);
          } catch {
            const base64 = imageData.split(',')[1];
            const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            image = await pdfDoc.embedJpg(bytes);
          }
        }

        // Calculate dimensions preserving aspect ratio
        const aspectRatio = image.width / image.height;
        let drawWidth = maxImageWidth;
        let drawHeight = drawWidth / aspectRatio;

        if (drawHeight > maxImageHeight) {
          drawHeight = maxImageHeight;
          drawWidth = drawHeight * aspectRatio;
        }

        // Check if we need a new page for this image
        if (imageY + drawHeight > height - 60) {
          currentPage = pdfDoc.addPage([width, height]);
          imageY = 50;
        }

        // Draw image on current page, centered horizontally
        currentPage.drawImage(image, {
          x: leftMargin + (maxImageWidth - drawWidth) / 2,
          y: height - imageY - drawHeight,
          width: drawWidth,
          height: drawHeight,
        });

        // Move Y position down for next image
        imageY += drawHeight + imagePadding;
      } catch (e) {
        console.error('Error embedding image:', e);
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Direct function export for use in non-hook contexts (like TaskDetailModal)
 */
export async function generateDeliveryInfoPdf(formData: DeliveryInfoFormData): Promise<Blob> {
  return generateDeliveryInfoPdfInternal(formData);
}

/**
 * Hook za generiranje in prenos PDF dokumenta
 */
export function useDeliveryInfoPdf() {
  const generatePdf = async (formData: DeliveryInfoFormData): Promise<Blob> => {
    return generateDeliveryInfoPdfInternal(formData);
  };

  const downloadPdf = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateFileName = (companyName: string): string => {
    const safeName = companyName.replace(/[^a-zA-Z0-9čšžČŠŽ]/g, '-');
    const date = new Date().toISOString().split('T')[0];
    return `Dostava-${safeName}-${date}.pdf`;
  };

  return {
    generatePdf,
    downloadPdf,
    generateFileName,
  };
}
