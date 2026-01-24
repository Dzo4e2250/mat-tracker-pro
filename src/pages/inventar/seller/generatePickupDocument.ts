/**
 * @file generatePickupDocument.ts
 * @description Generiranje HTML dokumenta za prevzem predpražnikov
 */

import type { DirtyMat, SellerProfile } from '../components/types';

export function generatePickupDocument(
  mats: DirtyMat[],
  pickupType: 'customer' | 'warehouse',
  seller: SellerProfile | undefined
) {
  const today = new Date().toLocaleDateString('sl-SI', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isCustomerPickup = pickupType === 'customer';
  const documentTitle = isCustomerPickup
    ? '📦 Nalog za prevzem OD STRANK'
    : '🏭 Nalog za prevzem IZ SKLADIŠČA';
  const headerColor = isCustomerPickup ? '#1a73e8' : '#f97316';

  const getGoogleMapsUrl = (mat: DirtyMat) => {
    if (mat.companyLatitude && mat.companyLongitude) {
      return `https://www.google.com/maps/search/?api=1&query=${mat.companyLatitude},${mat.companyLongitude}`;
    } else if (mat.companyAddress) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mat.companyAddress)}`;
    }
    return null;
  };

  let itemsHtml: string;

  if (isCustomerPickup) {
    itemsHtml = mats.map((mat, index) => {
      const mapsUrl = getGoogleMapsUrl(mat);
      const coords = mat.companyLatitude && mat.companyLongitude
        ? `${mat.companyLatitude.toFixed(6)}, ${mat.companyLongitude.toFixed(6)}`
        : 'Ni koordinat';

      return `
        <div style="page-break-inside: avoid; border: 2px solid #333; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: #fafafa;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div>
              <span style="font-size: 24px; font-weight: bold; font-family: monospace; background: #e5e5e5; padding: 5px 10px; border-radius: 4px;">${mat.qrCode}</span>
              <span style="margin-left: 10px; color: #666;">${mat.matTypeCode || mat.matTypeName}</span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 18px; font-weight: bold;">#${index + 1}</span>
            </div>
          </div>

          <div style="margin: 15px 0; padding: 10px; background: #fff; border-radius: 4px;">
            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold;">
              🏢 ${mat.companyName || 'Neznana stranka'}
            </p>
            <p style="margin: 0 0 8px 0; font-size: 16px;">
              📍 ${mat.companyAddress || 'Naslov ni znan'}
            </p>
            <p style="margin: 0; font-size: 12px; color: #666;">
              🌐 Koordinate: ${coords}
            </p>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
            <div>
              ${mat.contactName ? `<p style="margin: 0 0 5px 0;"><strong>👤 Kontakt:</strong> ${mat.contactName}</p>` : ''}
              ${mat.contactPhone ? `<p style="margin: 0;"><strong>📞 Telefon:</strong> <a href="tel:${mat.contactPhone}">${mat.contactPhone}</a></p>` : ''}
            </div>
            <div style="border: 2px solid #333; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
              ☐
            </div>
          </div>

          ${mapsUrl ? `
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ccc;">
            <a href="${mapsUrl}" style="color: #1a73e8; text-decoration: none; font-size: 12px;">
              🗺️ Odpri v Google Maps
            </a>
          </div>
          ` : ''}
        </div>
      `;
    }).join('');
  } else {
    itemsHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background: #f0f0f0;">
            <th style="border: 2px solid #333; padding: 12px; text-align: center; width: 50px;">#</th>
            <th style="border: 2px solid #333; padding: 12px; text-align: left;">QR Koda</th>
            <th style="border: 2px solid #333; padding: 12px; text-align: left;">Tip</th>
            <th style="border: 2px solid #333; padding: 12px; text-align: center; width: 80px;">Pobrano</th>
          </tr>
        </thead>
        <tbody>
          ${mats.map((mat, index) => `
            <tr>
              <td style="border: 2px solid #333; padding: 12px; text-align: center; font-weight: bold;">${index + 1}</td>
              <td style="border: 2px solid #333; padding: 12px; font-family: monospace; font-size: 18px; font-weight: bold;">${mat.qrCode}</td>
              <td style="border: 2px solid #333; padding: 12px;">${mat.matTypeCode || mat.matTypeName}</td>
              <td style="border: 2px solid #333; padding: 12px; text-align: center;">
                <span style="font-size: 24px;">☐</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  let multiStopUrl: string | null = null;
  if (isCustomerPickup) {
    const allAddresses = mats
      .filter(m => m.companyAddress || (m.companyLatitude && m.companyLongitude))
      .map(m => {
        if (m.companyLatitude && m.companyLongitude) {
          return `${m.companyLatitude},${m.companyLongitude}`;
        }
        return encodeURIComponent(m.companyAddress!);
      });

    multiStopUrl = allAddresses.length > 0
      ? `https://www.google.com/maps/dir/${allAddresses.join('/')}`
      : null;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="sl">
    <head>
      <meta charset="UTF-8">
      <title>${isCustomerPickup ? 'Prevzem od strank' : 'Prevzem iz skladišča'} - ${today}</title>
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
        h1 { margin-bottom: 5px; color: ${headerColor}; }
        .subtitle { color: #666; margin-bottom: 20px; }
        .summary {
          background: ${isCustomerPickup ? '#e3f2fd' : '#fff3e0'};
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 4px solid ${headerColor};
        }
        .print-btn {
          background: ${headerColor};
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
          background: ${headerColor};
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px;">
        <button class="print-btn" onclick="window.print()">🖨️ Natisni</button>
        ${multiStopUrl ? `<a href="${multiStopUrl}" target="_blank" class="print-btn" style="text-decoration: none; display: inline-block;">🗺️ Odpri vse lokacije v Maps</a>` : ''}
      </div>

      <div class="type-badge">${isCustomerPickup ? 'PREVZEM OD STRANK' : 'PREVZEM IZ SKLADIŠČA'}</div>
      <h1>${documentTitle}</h1>
      <p class="subtitle">
        <strong>Datum:</strong> ${today}<br>
        <strong>Prodajalec:</strong> ${seller?.first_name} ${seller?.last_name}
      </p>

      <div class="summary">
        <strong>Število predpražnikov:</strong> ${mats.length}<br>
        ${isCustomerPickup
          ? `<strong>Lokacije:</strong> ${new Set(mats.map(m => m.companyName).filter(Boolean)).size} različnih strank`
          : `<strong>Lokacija:</strong> Skladišče prodajalca`
        }
      </div>

      <h2>Seznam za prevzem:</h2>
      ${itemsHtml}

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
