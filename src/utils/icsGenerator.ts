/**
 * @file icsGenerator.ts
 * @description Shared utility for generating and downloading ICS calendar files.
 * Used by HistoryView and CompanyDetailModal.
 */

/**
 * Format a Date object to ICS date format (e.g., "20260130T090000Z")
 */
export function formatICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export interface ICSEventParams {
  uid: string;
  startDate: Date;
  endDate: Date;
  summary: string;
  description: string;
  location?: string;
  filename: string;
}

/**
 * Generate an ICS calendar file and trigger a browser download.
 */
export function generateAndDownloadICS(params: ICSEventParams): void {
  const { uid, startDate, endDate, summary, description, location, filename } = params;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mat Tracker Pro//SL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-MS-OLK-FORCEINSPECTOROPEN:TRUE',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${summary.replace(/,/g, '\\,')}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location.replace(/,/g, '\\,')}` : '',
    'SEQUENCE:0',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'X-MICROSOFT-CDO-BUSYSTATUS:BUSY',
    'X-MICROSOFT-CDO-IMPORTANCE:1',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  const icsContent = lines.join('\r\n');
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
