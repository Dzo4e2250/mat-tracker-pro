/**
 * @file generateDirtyTransportDocument.ts
 * @description Generiranje HTML dokumenta za odvoz umazanih predpražnikov
 * Dokument za šoferja - seznam umazanih predpražnikov za prevzem
 */

import type { DirtyMat, SellerProfile } from '../components/types';

export function generateDirtyTransportDocument(
  mats: DirtyMat[],
  seller: SellerProfile | undefined
) {
  const today = new Date().toLocaleDateString('sl-SI', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Group mats by mat type for summary
  const matTypeCounts = new Map<string, number>();
  mats.forEach(mat => {
    const type = mat.matTypeCode || mat.matTypeName || 'Neznano';
    matTypeCounts.set(type, (matTypeCounts.get(type) || 0) + 1);
  });

  const summaryHtml = Array.from(matTypeCounts.entries())
    .map(([type, count]) => `<span style="margin-right: 15px;"><strong>${type}:</strong> ${count}</span>`)
    .join('');

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <thead>
        <tr style="background: #f0f0f0;">
          <th style="border: 2px solid #333; padding: 12px; text-align: center; width: 50px;">#</th>
          <th style="border: 2px solid #333; padding: 12px; text-align: left;">QR Koda</th>
          <th style="border: 2px solid #333; padding: 12px; text-align: left;">Tip</th>
          <th style="border: 2px solid #333; padding: 12px; text-align: left;">Stranka</th>
          <th style="border: 2px solid #333; padding: 12px; text-align: center; width: 80px;">Pobrano</th>
        </tr>
      </thead>
      <tbody>
        ${mats.map((mat, index) => `
          <tr style="page-break-inside: avoid;">
            <td style="border: 2px solid #333; padding: 12px; text-align: center; font-weight: bold;">${index + 1}</td>
            <td style="border: 2px solid #333; padding: 12px; font-family: monospace; font-size: 18px; font-weight: bold;">${mat.qrCode}</td>
            <td style="border: 2px solid #333; padding: 12px;">${mat.matTypeCode || mat.matTypeName || '-'}</td>
            <td style="border: 2px solid #333; padding: 12px;">
              ${mat.companyName ? `<div style="font-weight: bold;">${mat.companyName}</div>` : ''}
              ${mat.companyAddress ? `<div style="font-size: 12px; color: #666;">${mat.companyAddress}</div>` : ''}
            </td>
            <td style="border: 2px solid #333; padding: 12px; text-align: center;">
              <span style="font-size: 24px;">☐</span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="sl">
    <head>
      <meta charset="UTF-8">
      <title>Odvoz umazanih predpražnikov - ${today}</title>
      <style>
        @media print {
          body { margin: 0; padding: 15px; }
          .no-print { display: none !important; }
          a { color: #333 !important; }
        }
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        h1 { margin-bottom: 5px; color: #dc2626; }
        .subtitle { color: #666; margin-bottom: 20px; }
        .summary {
          background: #fef2f2;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 4px solid #dc2626;
        }
        .print-btn {
          background: #dc2626;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          margin-right: 10px;
        }
        .print-btn:hover { opacity: 0.9; }
        .type-badge {
          display: inline-block;
          padding: 5px 15px;
          border-radius: 20px;
          font-weight: bold;
          color: white;
          background: #dc2626;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px;">
        <button class="print-btn" onclick="window.print()">🖨️ Natisni</button>
      </div>

      <div class="type-badge">ODVOZ UMAZANIH PREDPRAŽNIKOV</div>
      <h1>🚛 Nalog za odvoz umazanih predpražnikov</h1>
      <p class="subtitle">
        <strong>Datum:</strong> ${today}<br>
        <strong>Prodajalec:</strong> ${seller?.first_name || ''} ${seller?.last_name || ''}
      </p>

      <div class="summary">
        <strong>Skupaj predpražnikov:</strong> ${mats.length}<br>
        <div style="margin-top: 8px;">${summaryHtml}</div>
      </div>

      <h2>Seznam za odvoz:</h2>
      ${tableHtml}

      <div style="margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
        <p style="margin: 0 0 10px 0;"><strong>Podpis šoferja:</strong> _______________________</p>
        <p style="margin: 0;"><strong>Datum/Ura prevzema:</strong> _______________________</p>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #333;">
        <p style="color: #666; font-size: 12px;">
          Dokument generiran: ${new Date().toLocaleString('sl-SI')}<br>
          Mat Tracker Pro - Lindstrom Group
        </p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      URL.revokeObjectURL(url);
    };
  }
}
