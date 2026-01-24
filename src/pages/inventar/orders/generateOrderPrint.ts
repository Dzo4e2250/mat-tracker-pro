import type { OrderWithSeller } from './useOrderQueries';

interface QRCode {
  code: string;
}

export function generateOrderPrintContent(
  order: OrderWithSeller,
  codes: QRCode[]
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Naročilo za pralnico - ${order.salespersonName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 5px; }
          .meta { color: #666; margin-bottom: 20px; font-size: 14px; }
          .codes-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-top: 20px;
          }
          .code-item {
            border: 2px solid #333;
            padding: 15px;
            text-align: center;
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            border-radius: 8px;
          }
          .summary {
            margin: 20px 0;
            padding: 15px;
            background: #f0f0f0;
            border-radius: 8px;
          }
          .checkbox {
            width: 20px;
            height: 20px;
            border: 2px solid #333;
            display: inline-block;
            margin-right: 10px;
            vertical-align: middle;
          }
          @media print {
            .code-item { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>📦 Priprava predpražnikov</h1>
        <div class="meta">
          <strong>Prodajalec:</strong> ${order.salespersonName} (${order.salespersonPrefix || 'N/A'})<br>
          <strong>Datum:</strong> ${new Date().toLocaleDateString('sl-SI')}<br>
          <strong>Čas:</strong> ${new Date().toLocaleTimeString('sl-SI')}
        </div>
        <div class="summary">
          <strong>Skupaj predpražnikov: ${codes.length}</strong><br>
          Prosim pripravite spodaj navedene predpražnike in nanje nalepite ustrezne QR nalepke.
        </div>
        <div class="codes-grid">
          ${codes
            .map(
              (c) => `
            <div class="code-item">
              <span class="checkbox"></span>
              ${c.code}
            </div>
          `
            )
            .join('')}
        </div>
      </body>
    </html>
  `;
}

export function printOrderCodes(htmlContent: string): void {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
      URL.revokeObjectURL(url);
    };
  }
}
