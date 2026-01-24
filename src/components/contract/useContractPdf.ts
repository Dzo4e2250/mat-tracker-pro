/**
 * @file useContractPdf.ts
 * @description Hook za generiranje PDF pogodbe
 */

import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { ContractFormData } from './types';

// Debug/calibration mode - set to true to show coordinate grid
const DEBUG_COORDINATES = false;

interface PdfHelpers {
  font: any;
  fontBold: any;
  height: number;
  fontSize: number;
  smallFontSize: number;
}

// Helper za risanje teksta
function drawText(
  page: any,
  text: string,
  x: number,
  y: number,
  { font, height, fontSize }: PdfHelpers,
  size = fontSize,
  bold = false,
  fontBold?: any
) {
  if (!text) return;
  page.drawText(text, {
    x,
    y: height - y,
    size,
    font: bold ? fontBold : font,
    color: rgb(0, 0, 0),
  });
}

// Helper za tekst z prelomom vrstice
function drawWrappedText(
  page: any,
  text: string,
  x: number,
  y: number,
  maxX: number,
  lineHeight: number,
  { font, height, fontSize }: PdfHelpers,
  size = fontSize
) {
  if (!text) return;
  const words = text.split(' ');
  let currentLine = '';
  let currentY = y;

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = font.widthOfTextAtSize(testLine, size);

    if (x + textWidth > maxX && currentLine) {
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
  }
}

// Helper za checkbox X
function drawCheckbox(
  page: any,
  x: number,
  y: number,
  checked: boolean,
  { fontBold, height }: PdfHelpers
) {
  if (checked) {
    page.drawText('X', {
      x: x + 2,
      y: height - y - 1,
      size: 10,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  }
}

// Helper za desno poravnan tekst
function drawTextRight(
  page: any,
  text: string,
  rightX: number,
  y: number,
  { font, height, fontSize }: PdfHelpers,
  size = fontSize
) {
  if (!text) return;
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: rightX - textWidth,
    y: height - y,
    size,
    font,
    color: rgb(0, 0, 0),
  });
}

// Debug grid za kalibracijo
function drawDebugGrid(page: any, font: any, height: number, width: number) {
  const gridColor = rgb(1, 0, 0);

  for (let y = 0; y <= 842; y += 25) {
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
      size: 4,
      font,
      color: gridColor,
    });
  }

  for (let x = 0; x <= 595; x += 25) {
    const isMajor = x % 50 === 0;
    page.drawLine({
      start: { x, y: 0 },
      end: { x, y: height },
      thickness: isMajor ? 0.4 : 0.2,
      color: gridColor,
    });
    if (x > 0) {
      page.drawText(`${x}`, {
        x: x + 1,
        y: height - 8,
        size: 4,
        font,
        color: gridColor,
      });
    }
  }
}

export async function generateContractPdf(
  formData: ContractFormData,
  parentCompany?: { id: string; name: string } | null
): Promise<Blob> {
  // Load the PDF template
  const templateUrl = '/pogodba-template.pdf';
  const templateResponse = await fetch(templateUrl);
  const templateArrayBuffer = await templateResponse.arrayBuffer();

  const pdfDoc = await PDFDocument.load(templateArrayBuffer);
  pdfDoc.registerFontkit(fontkit);

  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const page2 = pages[1];

  const { height, width } = page1.getSize();

  // Load fonts
  const fontRegularResponse = await fetch('/fonts/Roboto-Regular.ttf');
  const fontRegularBytes = await fontRegularResponse.arrayBuffer();
  const font = await pdfDoc.embedFont(fontRegularBytes);

  const fontBoldResponse = await fetch('/fonts/Roboto-Bold.ttf');
  const fontBoldBytes = await fontBoldResponse.arrayBuffer();
  const fontBold = await pdfDoc.embedFont(fontBoldBytes);

  const fontSize = 8;
  const smallFontSize = 7;

  const helpers: PdfHelpers = { font, fontBold, height, fontSize, smallFontSize };

  // Debug grid
  if (DEBUG_COORDINATES) {
    drawDebugGrid(page1, font, height, width);
  }

  // Column positions
  const col1X = 55;
  const col2X = 245;
  const col3X = 400;

  // Row Y positions
  const row1Y = 143;
  const row2Y = 170;
  const row3Y = 195;
  const row4Y = 220;
  const row5Y = 250;
  const checkboxY = 265;

  // Company info
  drawText(page1, formData.companyName || '', col1X, row1Y, helpers);
  drawText(page1, formData.customerNumber || '', col2X, row1Y, helpers);
  drawText(page1, formData.taxNumber || '', col3X, row1Y, helpers);

  // Delivery address
  drawText(page1, formData.deliveryAddress || '', col1X, row2Y, helpers);
  drawText(page1, formData.deliveryPostal || '', col2X, row2Y, helpers);
  drawText(page1, formData.deliveryCity || '', col3X, row2Y, helpers);

  // Billing address
  if (parentCompany || !formData.useSameAsBilling) {
    drawText(page1, formData.billingAddress || '', col1X, row3Y, helpers);
    drawText(page1, formData.billingPostal || '', col2X, row3Y, helpers);
    drawText(page1, formData.billingCity || '', col3X, row3Y, helpers);
  }

  // Billing contact
  drawText(page1, formData.billingContactName || '', col1X, row4Y, helpers);
  drawText(page1, formData.billingContactPhone || '', col2X, row4Y, helpers);
  drawText(page1, formData.billingContactEmail || '', col3X, row4Y, helpers);

  // Service contact
  if (!formData.useSameAsService) {
    drawText(page1, formData.serviceContactName || '', col1X, row5Y, helpers);
    drawText(page1, formData.serviceContactPhone || '', col2X, row5Y, helpers);
    drawText(page1, formData.serviceContactEmail || '', col3X, row5Y, helpers);
  }

  // Contract type checkboxes
  drawCheckbox(page1, 53, checkboxY, formData.contractType === 'new', helpers);
  drawCheckbox(page1, 135, checkboxY - 4, formData.contractType === 'renewal', helpers);

  // Items table
  const itemsStartY = 385;
  const itemRowHeight = 17;
  const itemCols = {
    koda: 25,
    naziv: 80,
    velikost: 138,
    prilagojen: 196,
    kolicina: 255,
    frekvenca: 295,
    sezonske: 340,
    cenaTeden: 460,
    povracilo: 525,
  };

  formData.items.slice(0, 7).forEach((item, index) => {
    const rowOffsets = [0, 2.5, 5, 8.5, 8.5, 8.5, 8.5];
    const y = itemsStartY + (index * itemRowHeight) + (rowOffsets[index] || 0);

    drawText(page1, item.code || '', itemCols.koda, y, helpers, smallFontSize);

    const naziv = item.name || 'Predpražnik';
    if (naziv.length > 12) {
      const words = naziv.split(' ');
      const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
      const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
      drawText(page1, line1, itemCols.naziv, y - 4, helpers, smallFontSize);
      drawText(page1, line2, itemCols.naziv, y + 4, helpers, smallFontSize);
    } else {
      drawText(page1, naziv, itemCols.naziv, y, helpers, smallFontSize);
    }

    drawText(page1, item.size || '', itemCols.velikost, y, helpers, smallFontSize);
    drawText(page1, item.customized ? 'da' : 'ne', itemCols.prilagojen, y, helpers, smallFontSize);
    drawText(page1, String(item.quantity || 0), itemCols.kolicina, y, helpers, smallFontSize);
    drawText(page1, item.frequency ? `${item.frequency} tedne` : '', itemCols.frekvenca, y, helpers, smallFontSize);
    drawText(page1, item.seasonal || '', itemCols.sezonske, y, helpers, smallFontSize);
    drawTextRight(page1, (item.pricePerWeek || 0).toFixed(2), 473, y, helpers, smallFontSize);
    drawTextRight(page1, (item.replacementCost || 0).toFixed(2), 544, y, helpers, smallFontSize);
  });

  // Additional fields
  drawText(page1, formData.serviceStartDate ? new Date(formData.serviceStartDate).toLocaleDateString('sl-SI') : '', 225, 555, helpers);
  drawWrappedText(page1, formData.deliveryInstructions || '', 225, 570, 505, 10, helpers);
  drawText(page1, formData.workingHours || '', 270, 615, helpers);
  drawText(page1, formData.doorCode || '', 250, 632, helpers);
  drawCheckbox(page1, 400, 630, formData.hasKey === 'yes', helpers);
  drawCheckbox(page1, 420, 631, formData.hasKey === 'no', helpers);
  drawWrappedText(page1, formData.additionalInfo || '', 225, 650, 505, 10, helpers);

  // Page 2 - Payment section
  const page2Height = page2.getSize().height;
  const page2Width = page2.getSize().width;

  if (DEBUG_COORDINATES) {
    drawDebugGrid(page2, font, page2Height, page2Width);
  }

  const drawTextPage2 = (text: string, x: number, y: number, size = fontSize) => {
    if (!text) return;
    page2.drawText(text, {
      x,
      y: page2Height - y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  };

  const drawCheckboxPage2 = (x: number, y: number, checked: boolean) => {
    if (checked) {
      page2.drawText('X', {
        x: x + 2,
        y: page2Height - y - 1,
        size: 10,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
    }
  };

  drawCheckboxPage2(259, 508, formData.paperInvoice);
  drawTextPage2(formData.bankTransfer || '', 260, 525);
  drawTextPage2(formData.eInvoice || '', 260, 542);
  drawTextPage2(formData.emailInvoice || '', 260, 559);
  drawTextPage2(formData.referenceNumber || '', 260, 576);

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export function useContractPdf() {
  const generatePdf = async (
    formData: ContractFormData,
    parentCompany?: { id: string; name: string } | null
  ): Promise<Blob> => {
    return generateContractPdf(formData, parentCompany);
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
    return `Pogodba-${companyName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  };

  return {
    generatePdf,
    downloadPdf,
    generateFileName,
  };
}
