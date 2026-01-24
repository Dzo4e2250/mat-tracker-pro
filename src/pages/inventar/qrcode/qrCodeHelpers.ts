/**
 * @file qrCodeHelpers.ts
 * @description Helper funkcije za QR kode - PDF generiranje, izvoz, tiskanje
 */

import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { LABEL_PRESETS, type LabelPresetKey } from './constants';
import type { QRCodeWithCycle } from './useQRCodeData';

export function getCodeStatus(code: QRCodeWithCycle): string {
  if (code.status === 'pending') return 'pending';
  if (code.status === 'available') return 'available';
  if (code.active_cycle) return code.active_cycle.status;
  return 'active';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Naročena',
    available: 'Prosta',
    active: 'Aktivna',
    clean: 'Čista',
    on_test: 'Na testu',
    dirty: 'Umazana',
    waiting_driver: 'Čaka prevzem',
  };
  return labels[status] || status;
}

export interface QRCodeStats {
  total: number;
  available: number;
  pending: number;
  active: number;
  onTest: number;
  waitingPickup: number;
}

export function calculateStats(qrCodes: QRCodeWithCycle[]): QRCodeStats {
  return {
    total: qrCodes.length,
    available: qrCodes.filter((c) => c.status === 'available').length,
    pending: qrCodes.filter((c) => c.status === 'pending').length,
    active: qrCodes.filter((c) => c.status === 'active').length,
    onTest: qrCodes.filter((c) => c.active_cycle?.status === 'on_test').length,
    waitingPickup: qrCodes.filter((c) => c.active_cycle?.status === 'waiting_driver').length,
  };
}

export function exportToExcel(
  codes: QRCodeWithCycle[],
  sellerName: string
) {
  const exportData = codes.map((code) => ({
    'QR Koda': code.code,
    Status: getCodeStatus(code),
    'Tip preproge': code.active_cycle?.mat_type?.name || '-',
    Podjetje: code.active_cycle?.company?.name || '-',
    'Začetek testa': code.active_cycle?.test_start_date
      ? new Date(code.active_cycle.test_start_date).toLocaleDateString('sl-SI')
      : '-',
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'QR Kode');
  const fileName = `${sellerName.replace(/\s+/g, '_')}_QR_kode_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function printCodesList(
  codes: QRCodeWithCycle[],
  sellerName: string,
  codePrefix: string | null,
  stats: QRCodeStats
) {
  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Seznam QR kod - ${sellerName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 10px; }
          .meta { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .summary { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
        </style>
      </head>
      <body>
        <h1>Seznam QR kod</h1>
        <div class="meta">
          <strong>Prodajalec:</strong> ${sellerName} (${codePrefix || 'N/A'})<br>
          <strong>Datum:</strong> ${new Date().toLocaleDateString('sl-SI')}<br>
          <strong>Čas:</strong> ${new Date().toLocaleTimeString('sl-SI')}
        </div>
        <div class="summary">
          <strong>Skupaj kod:</strong> ${stats.total}<br>
          <strong>Prostih:</strong> ${stats.available}<br>
          <strong>Na testu:</strong> ${stats.onTest}<br>
          <strong>Čaka prevzem:</strong> ${stats.waitingPickup}
        </div>
        <table>
          <thead>
            <tr><th>#</th><th>QR Koda</th><th>Status</th><th>Tip</th><th>Podjetje</th></tr>
          </thead>
          <tbody>
            ${codes.map((code, index) => `
              <tr>
                <td>${index + 1}</td>
                <td><strong>${code.code}</strong></td>
                <td>${getStatusLabel(getCodeStatus(code))}</td>
                <td>${code.active_cycle?.mat_type?.name || '-'}</td>
                <td>${code.active_cycle?.company?.name || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([printContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
      URL.revokeObjectURL(url);
    };
  }
}

export async function generateQRCodesPDF(
  printCodes: string[],
  qrRefs: { [key: string]: HTMLCanvasElement | null },
  presetKey: LabelPresetKey,
  sellerName: string
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const preset = LABEL_PRESETS[presetKey];

  const LABEL_WIDTH = preset.width;
  const LABEL_HEIGHT = preset.height;
  const COLS = preset.cols;
  const ROWS = preset.rows;
  const LEFT_MARGIN = preset.leftMargin;
  const TOP_MARGIN = preset.topMargin;
  const QR_SIZE = preset.qrSize;
  const FONT_SIZE = preset.fontSize;

  let labelIndex = 0;

  for (const code of printCodes) {
    const canvas = qrRefs[code];
    if (!canvas) continue;

    const pageIndex = Math.floor(labelIndex / (COLS * ROWS));
    const posOnPage = labelIndex % (COLS * ROWS);
    const col = posOnPage % COLS;
    const row = Math.floor(posOnPage / COLS);

    if (pageIndex > 0 && posOnPage === 0) {
      pdf.addPage();
    }

    const labelX = LEFT_MARGIN + col * LABEL_WIDTH;
    const labelY = TOP_MARGIN + row * LABEL_HEIGHT;
    const qrX = labelX + (LABEL_WIDTH - QR_SIZE) / 2;
    const qrY = labelY + 2;

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', qrX, qrY, QR_SIZE, QR_SIZE);

    pdf.setFontSize(FONT_SIZE);
    pdf.setFont('helvetica', 'bold');
    const textX = labelX + LABEL_WIDTH / 2;
    const textY = qrY + QR_SIZE + 4;
    pdf.text(code, textX, textY, { align: 'center' });

    labelIndex++;
  }

  pdf.save(`QR_Codes_${sellerName}_${new Date().toISOString().split('T')[0]}.pdf`);
}
