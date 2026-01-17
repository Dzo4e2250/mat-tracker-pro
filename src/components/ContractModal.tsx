import { useState, useEffect } from 'react';
import { X, FileSignature, Plus, Trash2, FileText, Send, Download, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { supabase } from '@/integrations/supabase/client';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_billing_contact?: boolean;
  is_service_contact?: boolean;
}

interface Company {
  id: string;
  name: string;
  tax_number: string | null;
  address_street: string | null;
  address_postal: string | null;
  address_city: string | null;
  delivery_address?: string | null;
  delivery_postal?: string | null;
  delivery_city?: string | null;
  billing_address?: string | null;
  billing_postal?: string | null;
  billing_city?: string | null;
  working_hours?: string | null;
  delivery_instructions?: string | null;
  customer_number?: string | null;
  contacts: Contact[];
}

interface OfferItem {
  notes: string;
  quantity: number;
  price_rental: number | null;
  price_penalty: number | null;
  width_cm: number;
  height_cm: number;
  seasonal?: boolean;
  seasonalFromWeek?: number;
  seasonalToWeek?: number;
  normalFromWeek?: number;
  normalToWeek?: number;
  frequency?: string;
  normalFrequency?: string;
  seasonalFrequency?: string;
  normalPrice?: number;
  seasonalPrice?: number;
}

interface Offer {
  id: string;
  offer_type: string;
  frequency: string | null;
  items: OfferItem[];
}

interface ContractFormData {
  companyName: string;
  customerNumber: string;
  taxNumber: string;
  deliveryAddress: string;
  deliveryPostal: string;
  deliveryCity: string;
  billingAddress: string;
  billingPostal: string;
  billingCity: string;
  useSameAsBilling: boolean;
  billingContactId: string;
  billingContactName: string;
  billingContactPhone: string;
  billingContactEmail: string;
  serviceContactId: string;
  serviceContactName: string;
  serviceContactPhone: string;
  serviceContactEmail: string;
  useSameAsService: boolean;
  contractType: 'new' | 'renewal';
  items: {
    code: string;
    name: string;
    size: string;
    customized: boolean;
    quantity: number;
    frequency: string;
    seasonal: string;
    pricePerWeek: number;
    replacementCost: number;
  }[];
  serviceStartDate: string;
  deliveryInstructions: string;
  workingHours: string;
  doorCode: string;
  hasKey: 'yes' | 'no' | '';
  additionalInfo: string;
  paperInvoice: boolean;
  bankTransfer: string;
  eInvoice: string;
  emailInvoice: string;
  referenceNumber: string;
}

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  offer: Offer;
  onContractSaved?: (contract: { offer_id: string; generated_at: string }) => void;
}

type ModalStep = 'edit' | 'confirm-send';

// Debug/calibration mode - set to true to show coordinate grid
const DEBUG_COORDINATES = false;

export default function ContractModal({ isOpen, onClose, company, offer, onContractSaved }: ContractModalProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<ModalStep>('edit');
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');

  const [formData, setFormData] = useState<ContractFormData>({
    companyName: '',
    customerNumber: '',
    taxNumber: '',
    deliveryAddress: '',
    deliveryPostal: '',
    deliveryCity: '',
    billingAddress: '',
    billingPostal: '',
    billingCity: '',
    useSameAsBilling: true,
    billingContactId: '',
    billingContactName: '',
    billingContactPhone: '',
    billingContactEmail: '',
    serviceContactId: '',
    serviceContactName: '',
    serviceContactPhone: '',
    serviceContactEmail: '',
    useSameAsService: true,
    contractType: 'new',
    items: [],
    serviceStartDate: new Date().toISOString().split('T')[0],
    deliveryInstructions: '',
    workingHours: '',
    doorCode: '',
    hasKey: '',
    additionalInfo: '',
    paperInvoice: false,
    bankTransfer: '',
    eInvoice: '',
    emailInvoice: '',
    referenceNumber: '',
  });

  useEffect(() => {
    if (isOpen) {
      setStep('edit');
      setGeneratedPdfBlob(null);
      setPdfFileName('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && company && offer) {
      const billingContact = company.contacts.find(c => c.is_billing_contact) || company.contacts[0];
      const serviceContact = company.contacts.find(c => c.is_service_contact) || billingContact;

      const contractItems: any[] = [];

      offer.items?.forEach(item => {
        const noteParts = (item.notes || '').split(' - ');
        const codePart = noteParts[0] || '';
        const sizePart = noteParts[1] || `${item.width_cm}x${item.height_cm}`;

        // If item has seasonal settings, create 2 rows (normal + seasonal)
        if (item.seasonal && item.seasonalFromWeek && item.seasonalToWeek && item.seasonalPrice) {
          // Row 1: Normal period
          const normalFrom = item.normalFromWeek || 13;
          const normalTo = item.normalToWeek || (item.seasonalFromWeek <= 1 ? 52 : item.seasonalFromWeek - 1);
          contractItems.push({
            code: codePart,
            name: 'Predpražnik',
            size: sizePart || `${item.width_cm}x${item.height_cm}`,
            customized: false,
            quantity: item.quantity || 1,
            frequency: item.normalFrequency || offer.frequency || '2',
            seasonal: `T${normalFrom}-${normalTo}`,
            pricePerWeek: item.normalPrice || item.price_rental || 0,
            replacementCost: item.price_penalty || 0,
          });

          // Row 2: Seasonal period
          contractItems.push({
            code: codePart,
            name: 'Predpražnik',
            size: sizePart || `${item.width_cm}x${item.height_cm}`,
            customized: false,
            quantity: item.quantity || 1,
            frequency: item.seasonalFrequency || '1',
            seasonal: `T${item.seasonalFromWeek}-${item.seasonalToWeek}`,
            pricePerWeek: item.seasonalPrice || 0,
            replacementCost: item.price_penalty || 0,
          });
        } else {
          // Non-seasonal item - single row
          contractItems.push({
            code: codePart,
            name: 'Predpražnik',
            size: sizePart || `${item.width_cm}x${item.height_cm}`,
            customized: false,
            quantity: item.quantity || 1,
            frequency: item.frequency || offer.frequency || '2',
            seasonal: '',
            pricePerWeek: item.price_rental || 0,
            replacementCost: item.price_penalty || 0,
          });
        }
      });

      setFormData({
        companyName: company.name || '',
        customerNumber: company.customer_number || '',
        taxNumber: company.tax_number || '',
        deliveryAddress: company.delivery_address || company.address_street || '',
        deliveryPostal: company.delivery_postal || company.address_postal || '',
        deliveryCity: company.delivery_city || company.address_city || '',
        billingAddress: company.billing_address || '',
        billingPostal: company.billing_postal || '',
        billingCity: company.billing_city || '',
        useSameAsBilling: !company.billing_address,
        billingContactId: billingContact?.id || '',
        billingContactName: billingContact ? `${billingContact.first_name} ${billingContact.last_name}` : '',
        billingContactPhone: billingContact?.phone || '',
        billingContactEmail: billingContact?.email || '',
        serviceContactId: serviceContact?.id || '',
        serviceContactName: serviceContact ? `${serviceContact.first_name} ${serviceContact.last_name}` : '',
        serviceContactPhone: serviceContact?.phone || '',
        serviceContactEmail: serviceContact?.email || '',
        useSameAsService: billingContact?.id === serviceContact?.id,
        contractType: 'new',
        items: contractItems,
        serviceStartDate: new Date().toISOString().split('T')[0],
        deliveryInstructions: company.delivery_instructions || '',
        workingHours: company.working_hours || '',
        doorCode: '',
        hasKey: '',
        additionalInfo: '',
        paperInvoice: false,
        bankTransfer: '',
        eInvoice: '',
        emailInvoice: '',
        referenceNumber: '',
      });
    }
  }, [isOpen, company, offer]);

  const updateField = (field: keyof ContractFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        code: '',
        name: 'Predpražnik',
        size: '',
        customized: false,
        quantity: 1,
        frequency: '2',
        seasonal: '',
        pricePerWeek: 0,
        replacementCost: 0,
      }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleContactChange = (type: 'billing' | 'service', contactId: string) => {
    const contact = company.contacts.find(c => c.id === contactId);
    if (type === 'billing') {
      updateField('billingContactId', contactId);
      updateField('billingContactName', contact ? `${contact.first_name} ${contact.last_name}` : '');
      updateField('billingContactPhone', contact?.phone || '');
      updateField('billingContactEmail', contact?.email || '');
    } else {
      updateField('serviceContactId', contactId);
      updateField('serviceContactName', contact ? `${contact.first_name} ${contact.last_name}` : '');
      updateField('serviceContactPhone', contact?.phone || '');
      updateField('serviceContactEmail', contact?.email || '');
    }
  };

  const generatePDF = async (): Promise<Blob> => {
    // Load the PDF template
    const templateUrl = '/pogodba-template.pdf';
    const templateResponse = await fetch(templateUrl);
    const templateArrayBuffer = await templateResponse.arrayBuffer();

    const pdfDoc = await PDFDocument.load(templateArrayBuffer);

    // Register fontkit to enable custom font embedding
    pdfDoc.registerFontkit(fontkit);

    const pages = pdfDoc.getPages();
    const page1 = pages[0];
    const page2 = pages[1];

    // Get page dimensions (A4: 595 x 842 points)
    const { height } = page1.getSize();

    // Load and embed custom fonts that support Slovenian characters (č, š, ž)
    const fontRegularResponse = await fetch('/fonts/Roboto-Regular.ttf');
    const fontRegularBytes = await fontRegularResponse.arrayBuffer();
    const font = await pdfDoc.embedFont(fontRegularBytes);

    const fontBoldResponse = await fetch('/fonts/Roboto-Bold.ttf');
    const fontBoldBytes = await fontBoldResponse.arrayBuffer();
    const fontBold = await pdfDoc.embedFont(fontBoldBytes);

    const fontSize = 8;
    const smallFontSize = 7;

    // DEBUG: Draw coordinate grid if enabled
    if (DEBUG_COORDINATES) {
      const gridColor = rgb(1, 0, 0); // Red for all lines
      const { width } = page1.getSize();

      // Draw horizontal lines every 25 points with labels
      for (let y = 0; y <= 842; y += 25) {
        const isMajor = y % 50 === 0;
        page1.drawLine({
          start: { x: 0, y: height - y },
          end: { x: width, y: height - y },
          thickness: isMajor ? 0.4 : 0.2,
          color: gridColor,
        });
        // Draw Y label every 25 points
        page1.drawText(`${y}`, {
          x: 3,
          y: height - y + 2,
          size: 4,
          font,
          color: gridColor,
        });
      }

      // Draw vertical lines every 25 points with labels
      for (let x = 0; x <= 595; x += 25) {
        const isMajor = x % 50 === 0;
        page1.drawLine({
          start: { x, y: 0 },
          end: { x, y: height },
          thickness: isMajor ? 0.4 : 0.2,
          color: gridColor,
        });
        if (x > 0) {
          page1.drawText(`${x}`, {
            x: x + 1,
            y: height - 8,
            size: 4,
            font,
            color: gridColor,
          });
        }
      }

      // Mark current field positions with blue dots and labels
      const blueColor = rgb(0, 0, 1);
      const fieldPositions = [
        { name: 'Stranka', x: 55, y: 140 },
        { name: 'St.str', x: 245, y: 140 },
        { name: 'Davcna', x: 400, y: 140 },
        { name: 'Dostava', x: 55, y: 165 },
        { name: 'Posta', x: 245, y: 165 },
        { name: 'Kraj', x: 400, y: 165 },
        { name: 'NaslovRacun', x: 55, y: 190 },
        { name: 'PostaR', x: 245, y: 190 },
        { name: 'KrajR', x: 400, y: 190 },
        { name: 'KontaktObr', x: 55, y: 220 },
        { name: 'Tel', x: 245, y: 220 },
        { name: 'Email', x: 400, y: 220 },
        { name: 'KontaktStor', x: 55, y: 245 },
        { name: 'Checkbox1', x: 55, y: 265 },
        { name: 'Checkbox2', x: 140, y: 265 },
        { name: 'Item1', x: 25, y: 385 },
      ];

      fieldPositions.forEach(({ name, x, y }) => {
        // Draw a small circle/dot
        page1.drawCircle({
          x,
          y: height - y,
          size: 3,
          color: blueColor,
        });
        // Label
        page1.drawText(`${name}(${x},${y})`, {
          x: x + 5,
          y: height - y - 3,
          size: 5,
          font,
          color: blueColor,
        });
      });
    }

    // Helper to draw text
    const drawText = (page: any, text: string, x: number, y: number, size = fontSize, bold = false) => {
      if (!text) return;
      page.drawText(text, {
        x,
        y: height - y,
        size,
        font: bold ? fontBold : font,
        color: rgb(0, 0, 0),
      });
    };

    // Helper to draw wrapped text (breaks at maxX and continues on new line)
    const drawWrappedText = (page: any, text: string, x: number, y: number, maxX: number, lineHeight: number, size = fontSize) => {
      if (!text) return;
      const words = text.split(' ');
      let currentLine = '';
      let currentY = y;

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, size);

        if (x + textWidth > maxX && currentLine) {
          // Draw current line and start new one
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

      // Draw remaining text
      if (currentLine) {
        page.drawText(currentLine, {
          x,
          y: height - currentY,
          size,
          font,
          color: rgb(0, 0, 0),
        });
      }
    };

    // Helper to draw checkbox X
    const drawCheckbox = (page: any, x: number, y: number, checked: boolean) => {
      if (checked) {
        page.drawText('X', {
          x: x + 2,
          y: height - y - 1,
          size: 10,
          font: fontBold,
          color: rgb(0, 0, 0),
        });
      }
    };

    // Helper to draw right-aligned text (x is the RIGHT edge)
    const drawTextRight = (page: any, text: string, rightX: number, y: number, size = fontSize) => {
      if (!text) return;
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: rightX - textWidth,
        y: height - y,
        size,
        font,
        color: rgb(0, 0, 0),
      });
    };

    // === PAGE 1 - Company Info Table ===
    // A4 page = 595 x 842 points
    //
    // CALIBRATION based on screenshot analysis:
    // - Company name at y=145 lands CORRECTLY in first data row
    // - Each subsequent section was ~17 points too low
    // - Row height in this table is ~17 points
    // - Table structure: header row + data row for each section
    //
    // Column X positions (3 columns):
    // Col 1: ~35-200 (Stranka/Naslov/Kontakt labels + data)
    // Col 2: ~200-380 (Št. stranke/Poštna št/Tel)
    // Col 3: ~380-560 (Davčna/Kraj/e-mail)

    const col1X = 55;
    const col2X = 245;
    const col3X = 400;

    // Y positions for DATA rows (calibrated by user)
    const row1Y = 143;  // Company name row (Stranka)
    const row2Y = 170;  // Delivery address row (Naslov za dostavo)
    const row3Y = 195;  // Billing address row (Naslov za račun)
    const row4Y = 220;  // Billing contact row (Kontaktna oseba za obračun)
    const row5Y = 250;  // Service contact row (Kontaktna oseba za storitev)
    const checkboxY = 265; // Checkbox row

    // Company info
    drawText(page1, formData.companyName || '', col1X, row1Y, fontSize);
    drawText(page1, formData.customerNumber || '', col2X, row1Y, fontSize);
    drawText(page1, formData.taxNumber || '', col3X, row1Y, fontSize);

    // Delivery address
    drawText(page1, formData.deliveryAddress || '', col1X, row2Y, fontSize);
    drawText(page1, formData.deliveryPostal || '', col2X, row2Y, fontSize);
    drawText(page1, formData.deliveryCity || '', col3X, row2Y, fontSize);

    // Billing address (if different)
    if (!formData.useSameAsBilling) {
      drawText(page1, formData.billingAddress || '', col1X, row3Y, fontSize);
      drawText(page1, formData.billingPostal || '', col2X, row3Y, fontSize);
      drawText(page1, formData.billingCity || '', col3X, row3Y, fontSize);
    }

    // Billing contact
    drawText(page1, formData.billingContactName || '', col1X, row4Y, fontSize);
    drawText(page1, formData.billingContactPhone || '', col2X, row4Y, fontSize);
    drawText(page1, formData.billingContactEmail || '', col3X, row4Y, fontSize);

    // Service contact (if different)
    if (!formData.useSameAsService) {
      drawText(page1, formData.serviceContactName || '', col1X, row5Y, fontSize);
      drawText(page1, formData.serviceContactPhone || '', col2X, row5Y, fontSize);
      drawText(page1, formData.serviceContactEmail || '', col3X, row5Y, fontSize);
    }

    // Contract type checkboxes
    drawCheckbox(page1, 53, checkboxY, formData.contractType === 'new');
    drawCheckbox(page1, 135, checkboxY - 4, formData.contractType === 'renewal');

    // === Items Table ===
    // Calibrated by user
    const itemsStartY = 385;
    const itemRowHeight = 17;

    // Column X positions - calibrated by user
    // Koda|Naziv|Velikost|Prilagojen|Količina|Frekvenca|Sezonske|Cena(Najem)|Povračilo
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
      // Row offsets calibrated by user:
      // Row 1 (index 0): 0, Row 2 (index 1): +2.5, Row 3 (index 2): +5, Row 4 (index 3): +8.5
      const rowOffsets = [0, 2.5, 5, 8.5, 8.5, 8.5, 8.5];
      const y = itemsStartY + (index * itemRowHeight) + (rowOffsets[index] || 0);

      drawText(page1, item.code || '', itemCols.koda, y, smallFontSize);

      // Naziv - split into two lines if "Predpražnik po meri"
      const naziv = item.name || 'Predpražnik';
      if (naziv.length > 12) {
        // Split into two lines
        const words = naziv.split(' ');
        const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
        const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
        drawText(page1, line1, itemCols.naziv, y - 4, smallFontSize);
        drawText(page1, line2, itemCols.naziv, y + 4, smallFontSize);
      } else {
        drawText(page1, naziv, itemCols.naziv, y, smallFontSize);
      }

      drawText(page1, item.size || '', itemCols.velikost, y, smallFontSize);

      // Kupcu prilagojen - show "da" or "ne"
      drawText(page1, item.customized ? 'da' : 'ne', itemCols.prilagojen, y, smallFontSize);

      drawText(page1, String(item.quantity || 0), itemCols.kolicina, y, smallFontSize);

      // Frekvenca - add "tedne" after number
      drawText(page1, item.frequency ? `${item.frequency} tedne` : '', itemCols.frekvenca, y, smallFontSize);

      drawText(page1, item.seasonal || '', itemCols.sezonske, y, smallFontSize);
      // Right-aligned numbers for price columns
      drawTextRight(page1, (item.pricePerWeek || 0).toFixed(2), 473, y, smallFontSize);
      drawTextRight(page1, (item.replacementCost || 0).toFixed(2), 544, y, smallFontSize);
    });

    // === Additional Fields Section ===
    // Below items table, around y=490-620

    // Service start date - in the box next to "Pričetek opravljanja storitve"
    drawText(page1, formData.serviceStartDate ? new Date(formData.serviceStartDate).toLocaleDateString('sl-SI') : '', 225, 555, fontSize);

    // Delivery instructions - below "Navodila za dostavo" label (wraps at x=505)
    drawWrappedText(page1, formData.deliveryInstructions || '', 225, 570, 505, 10, fontSize);

    // Working hours - next to "Delovni čas" label
    drawText(page1, formData.workingHours || '', 270, 615, fontSize);

    // Door code - next to "Koda" label
    drawText(page1, formData.doorCode || '', 250, 632, fontSize);

    // Key checkboxes (da / ne) - after "Ključ"
    drawCheckbox(page1, 400, 630, formData.hasKey === 'yes');
    drawCheckbox(page1, 420, 631, formData.hasKey === 'no');

    // Additional info - below "Dodatne informacije" (wraps at x=505)
    drawWrappedText(page1, formData.additionalInfo || '', 225, 650, 505, 10, fontSize);

    // === PAGE 2 - Payment Section ===
    // Payment section is in a table around middle of page 2
    // "Načini plačila" section with: Papirnat račun, Bančno nakazilo, eRačun, Email, Referenčna številka
    const page2Height = page2.getSize().height;
    const page2Width = page2.getSize().width;

    // DEBUG: Draw coordinate grid on page 2 if enabled
    if (DEBUG_COORDINATES) {
      const gridColor = rgb(1, 0, 0);

      // Draw horizontal lines every 25 points
      for (let y = 0; y <= 842; y += 25) {
        const isMajor = y % 50 === 0;
        page2.drawLine({
          start: { x: 0, y: page2Height - y },
          end: { x: page2Width, y: page2Height - y },
          thickness: isMajor ? 0.4 : 0.2,
          color: gridColor,
        });
        page2.drawText(`${y}`, {
          x: 3,
          y: page2Height - y + 2,
          size: 4,
          font,
          color: gridColor,
        });
      }

      // Draw vertical lines every 25 points
      for (let x = 0; x <= 595; x += 25) {
        const isMajor = x % 50 === 0;
        page2.drawLine({
          start: { x, y: 0 },
          end: { x, y: page2Height },
          thickness: isMajor ? 0.4 : 0.2,
          color: gridColor,
        });
        if (x > 0) {
          page2.drawText(`${x}`, {
            x: x + 1,
            y: page2Height - 8,
            size: 4,
            font,
            color: gridColor,
          });
        }
      }
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

    // Payment section coordinates based on PDF page 2 layout
    // The payment table is around y=515-600 from top
    // "Papirnat račun" has checkbox next to "da" at right side
    // Other fields have input areas to the right of labels

    // Papirnat račun checkbox (next to "da")
    drawCheckboxPage2(259, 508, formData.paperInvoice);

    // Bančno nakazilo - field to the right of label
    drawTextPage2(formData.bankTransfer || '', 260, 525, fontSize);

    // eRačun - field to the right of label
    drawTextPage2(formData.eInvoice || '', 260, 542, fontSize);

    // Email - field to the right of label
    drawTextPage2(formData.emailInvoice || '', 260, 559, fontSize);

    // Referenčna številka - field to the right of label
    drawTextPage2(formData.referenceNumber || '', 260, 576, fontSize);

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const pdfBlob = await generatePDF();
      const fileName = `Pogodba-${formData.companyName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

      setGeneratedPdfBlob(pdfBlob);
      setPdfFileName(fileName);

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        description: 'PDF pogodba uspesno generirana!'
      });

      if (onContractSaved) {
        onContractSaved({
          offer_id: offer.id,
          generated_at: new Date().toISOString(),
        });
      }

      setStep('confirm-send');

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ description: 'Napaka pri generiranju PDF dokumenta.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToClient = async () => {
    const recipientEmail = formData.billingContactEmail || '';
    const contractTypeText = formData.contractType === 'new' ? 'pogodbo' : 'aneks k pogodbi';

    const subject = encodeURIComponent(`Pogodba - ${formData.companyName}`);
    const body = encodeURIComponent(
      `Pozdravljeni,\n\nkot obljubljeno, vam v priponki pošiljam pripravljeno pogodbo.\n\nProsim vas, da si pogodbo ogledate in preberete. Če se z vsebino strinjate, nam prosim vrnite podpisan in žigosan izvod na ta elektronski naslov (skenirano).\n\nZa vsa morebitna dodatna vprašanja ali pojasnila sem vam z veseljem na voljo.\n\nLep pozdrav,`
    );

    // Update company pipeline status to 'contract_sent'
    if (company?.id) {
      try {
        await supabase
          .from('companies')
          .update({
            pipeline_status: 'contract_sent',
            contract_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', company.id);
      } catch (error) {
        console.error('Error updating pipeline status:', error);
      }
    }

    window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;

    toast({
      description: 'Email odpert - prilozi PDF dokument iz Prenosi mape!'
    });

    onClose();
  };

  const handleDownloadAgain = () => {
    if (generatedPdfBlob) {
      const url = URL.createObjectURL(generatedPdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getInputClass = (value: string | number | undefined | null) => {
    const base = "w-full px-3 py-2 border rounded-lg text-sm transition-colors";
    if (value && String(value).trim()) {
      return `${base} border-green-400 bg-green-50`;
    }
    return `${base} border-orange-300 bg-orange-50`;
  };

  const importantFields = [
    formData.companyName,
    formData.taxNumber,
    formData.deliveryAddress,
    formData.deliveryPostal,
    formData.deliveryCity,
    formData.billingContactName,
    formData.billingContactEmail,
  ];
  const filledCount = importantFields.filter(f => f && String(f).trim()).length;
  const totalCount = importantFields.length;

  if (!isOpen) return null;

  if (step === 'confirm-send') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              PDF uspesno generiran!
            </h3>
            <p className="text-gray-600 mb-6">
              Pogodba je bila prenesena. Ali zelis poslati pogodbo stranki?
            </p>

            <div className="space-y-3">
              <button
                onClick={handleSendToClient}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Send size={18} />
                Da, poslji stranki
              </button>

              <button
                onClick={handleDownloadAgain}
                className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <Download size={18} />
                Prenesi PDF ponovno
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 text-gray-500 hover:text-gray-700 transition-colors"
              >
                Zapri
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between bg-purple-600 text-white">
          <h3 className="font-bold flex items-center gap-2">
            <FileSignature size={20} />
            Pripravi pogodbo - Lindstrom predloga
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-purple-500 rounded">
            <X size={24} />
          </button>
        </div>

        <div className="px-4 py-3 bg-gray-100 border-b flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-400"></span>
              Izpolnjeno
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-orange-300"></span>
              Manjka
            </span>
          </div>
          <div className="text-sm font-medium">
            {filledCount === totalCount ? (
              <span className="text-green-600">Vsa obvezna polja izpolnjena</span>
            ) : (
              <span className="text-orange-600">Izpolnjeno {filledCount}/{totalCount} obveznih polj</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-purple-700">Podatki stranke</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stranka *</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  className={getInputClass(formData.companyName)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">St. stranke</label>
                <input
                  type="text"
                  value={formData.customerNumber}
                  onChange={(e) => updateField('customerNumber', e.target.value)}
                  className={getInputClass(formData.customerNumber)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Davcna stevilka *</label>
                <input
                  type="text"
                  value={formData.taxNumber}
                  onChange={(e) => updateField('taxNumber', e.target.value)}
                  className={getInputClass(formData.taxNumber)}
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-purple-700">Naslov za dostavo</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Ulica</label>
                <input
                  type="text"
                  value={formData.deliveryAddress}
                  onChange={(e) => updateField('deliveryAddress', e.target.value)}
                  className={getInputClass(formData.deliveryAddress)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Posta</label>
                  <input
                    type="text"
                    value={formData.deliveryPostal}
                    onChange={(e) => updateField('deliveryPostal', e.target.value)}
                    className={getInputClass(formData.deliveryPostal)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Kraj</label>
                  <input
                    type="text"
                    value={formData.deliveryCity}
                    onChange={(e) => updateField('deliveryCity', e.target.value)}
                    className={getInputClass(formData.deliveryCity)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-purple-700">Naslov za racun</h4>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.useSameAsBilling}
                  onChange={(e) => updateField('useSameAsBilling', e.target.checked)}
                  className="rounded"
                />
                Enak kot za dostavo
              </label>
            </div>
            {!formData.useSameAsBilling && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Ulica</label>
                  <input
                    type="text"
                    value={formData.billingAddress}
                    onChange={(e) => updateField('billingAddress', e.target.value)}
                    className={getInputClass(formData.billingAddress)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Posta</label>
                    <input
                      type="text"
                      value={formData.billingPostal}
                      onChange={(e) => updateField('billingPostal', e.target.value)}
                      className={getInputClass(formData.billingPostal)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Kraj</label>
                    <input
                      type="text"
                      value={formData.billingCity}
                      onChange={(e) => updateField('billingCity', e.target.value)}
                      className={getInputClass(formData.billingCity)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-purple-700">Kontaktne osebe</h4>

            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">Kontaktna oseba za obracun</label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select
                  value={formData.billingContactId}
                  onChange={(e) => handleContactChange('billing', e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Izberi...</option>
                  {company.contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={formData.billingContactName}
                  onChange={(e) => updateField('billingContactName', e.target.value)}
                  placeholder="Ime"
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={formData.billingContactPhone}
                  onChange={(e) => updateField('billingContactPhone', e.target.value)}
                  placeholder="Telefon"
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="email"
                  value={formData.billingContactEmail}
                  onChange={(e) => updateField('billingContactEmail', e.target.value)}
                  placeholder="Email"
                  className="px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-xs text-gray-500">Kontaktna oseba za storitev</label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={formData.useSameAsService}
                    onChange={(e) => {
                      updateField('useSameAsService', e.target.checked);
                      if (e.target.checked) {
                        handleContactChange('service', formData.billingContactId);
                      }
                    }}
                    className="rounded"
                  />
                  Enaka kot za obracun
                </label>
              </div>
              {!formData.useSameAsService && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select
                    value={formData.serviceContactId}
                    onChange={(e) => handleContactChange('service', e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Izberi...</option>
                    {company.contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formData.serviceContactName}
                    onChange={(e) => updateField('serviceContactName', e.target.value)}
                    placeholder="Ime"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={formData.serviceContactPhone}
                    onChange={(e) => updateField('serviceContactPhone', e.target.value)}
                    placeholder="Telefon"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="email"
                    value={formData.serviceContactEmail}
                    onChange={(e) => updateField('serviceContactEmail', e.target.value)}
                    placeholder="Email"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-purple-700">Tip pogodbe</h4>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="contractType"
                  checked={formData.contractType === 'new'}
                  onChange={() => updateField('contractType', 'new')}
                  className="w-4 h-4"
                />
                <span>Nova pogodba</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="contractType"
                  checked={formData.contractType === 'renewal'}
                  onChange={() => updateField('contractType', 'renewal')}
                  className="w-4 h-4"
                />
                <span>Obnovitev pogodbe / Aneks</span>
              </label>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-purple-700">Artikli za najem</h4>
              <button
                onClick={addItem}
                className="text-sm text-purple-600 flex items-center gap-1 hover:underline"
              >
                <Plus size={16} /> Dodaj artikel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-purple-100 text-left">
                    <th className="px-2 py-1">Koda</th>
                    <th className="px-2 py-1">Naziv</th>
                    <th className="px-2 py-1">Velikost</th>
                    <th className="px-2 py-1">Prilag.</th>
                    <th className="px-2 py-1">Kol.</th>
                    <th className="px-2 py-1">Frekv.</th>
                    <th className="px-2 py-1">Sezonsko</th>
                    <th className="px-2 py-1">EUR/teden</th>
                    <th className="px-2 py-1">Povracilo</th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={item.code}
                          onChange={(e) => updateItem(index, 'code', e.target.value)}
                          className="w-16 px-1 py-1 border rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <select
                          value={item.name}
                          onChange={(e) => updateItem(index, 'name', e.target.value)}
                          className="w-28 px-1 py-1 border rounded text-xs"
                        >
                          <option value="Predpražnik">Predpražnik</option>
                          <option value="Predpražnik po meri">Predpražnik po meri</option>
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={item.size}
                          onChange={(e) => updateItem(index, 'size', e.target.value)}
                          className="w-16 px-1 py-1 border rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <select
                          value={item.customized ? 'da' : 'ne'}
                          onChange={(e) => updateItem(index, 'customized', e.target.value === 'da')}
                          className="w-12 px-1 py-1 border rounded text-xs"
                        >
                          <option value="ne">ne</option>
                          <option value="da">da</option>
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-12 px-1 py-1 border rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <select
                          value={item.frequency}
                          onChange={(e) => updateItem(index, 'frequency', e.target.value)}
                          className="w-14 px-1 py-1 border rounded text-xs"
                        >
                          <option value="1">1 ted</option>
                          <option value="2">2 ted</option>
                          <option value="3">3 ted</option>
                          <option value="4">4 ted</option>
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={item.seasonal}
                          onChange={(e) => updateItem(index, 'seasonal', e.target.value)}
                          placeholder="npr. T13-44"
                          className="w-20 px-1 py-1 border rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          step="0.01"
                          value={item.pricePerWeek}
                          onChange={(e) => updateItem(index, 'pricePerWeek', parseFloat(e.target.value) || 0)}
                          className="w-16 px-1 py-1 border rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          step="0.01"
                          value={item.replacementCost}
                          onChange={(e) => updateItem(index, 'replacementCost', parseFloat(e.target.value) || 0)}
                          className="w-16 px-1 py-1 border rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <button
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:bg-red-50 p-1 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-purple-700">Dodatni podatki</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pricetek opravljanja storitve</label>
                <input
                  type="date"
                  value={formData.serviceStartDate}
                  onChange={(e) => updateField('serviceStartDate', e.target.value)}
                  className={getInputClass(formData.serviceStartDate)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Delovni cas</label>
                <input
                  type="text"
                  value={formData.workingHours}
                  onChange={(e) => updateField('workingHours', e.target.value)}
                  placeholder="npr. Pon-Pet 8:00-16:00"
                  className={getInputClass(formData.workingHours)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Navodila za dostavo</label>
                <textarea
                  value={formData.deliveryInstructions}
                  onChange={(e) => updateField('deliveryInstructions', e.target.value)}
                  rows={2}
                  className={getInputClass(formData.deliveryInstructions)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Koda (vrata)</label>
                <input
                  type="text"
                  value={formData.doorCode}
                  onChange={(e) => updateField('doorCode', e.target.value)}
                  className={getInputClass(formData.doorCode)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Kljuc</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="hasKey"
                      checked={formData.hasKey === 'yes'}
                      onChange={() => updateField('hasKey', 'yes')}
                    />
                    Da
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="hasKey"
                      checked={formData.hasKey === 'no'}
                      onChange={() => updateField('hasKey', 'no')}
                    />
                    Ne
                  </label>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Dodatne informacije</label>
                <textarea
                  value={formData.additionalInfo}
                  onChange={(e) => updateField('additionalInfo', e.target.value)}
                  rows={2}
                  className={getInputClass(formData.additionalInfo)}
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-purple-700">Nacini placila</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.paperInvoice}
                  onChange={(e) => updateField('paperInvoice', e.target.checked)}
                />
                Papirnat racun
              </label>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bancno nakazilo</label>
                <input
                  type="text"
                  value={formData.bankTransfer}
                  onChange={(e) => updateField('bankTransfer', e.target.value)}
                  className={getInputClass(formData.bankTransfer)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">eRacun</label>
                <input
                  type="text"
                  value={formData.eInvoice}
                  onChange={(e) => updateField('eInvoice', e.target.value)}
                  className={getInputClass(formData.eInvoice)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input
                  type="text"
                  value={formData.emailInvoice}
                  onChange={(e) => updateField('emailInvoice', e.target.value)}
                  className={getInputClass(formData.emailInvoice)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Referencna stevilka</label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => updateField('referenceNumber', e.target.value)}
                  className={getInputClass(formData.referenceNumber)}
                />
              </div>
            </div>
          </div>

        </div>

        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 border rounded-lg text-gray-600"
          >
            Preklici
          </button>
          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <FileText size={18} />
            {isGenerating ? 'Generiram...' : 'Koncaj in generiraj PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
