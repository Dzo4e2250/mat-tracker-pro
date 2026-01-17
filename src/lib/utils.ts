import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Characters for random QR code generation (without confusing chars: 0/O, 1/I/L)
const QR_CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Generate a random QR code suffix (4 alphanumeric characters)
 * Example: "X7K2", "9RPM", "4HBN"
 */
export function generateRandomCodeSuffix(length = 4): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += QR_CODE_CHARS.charAt(Math.floor(Math.random() * QR_CODE_CHARS.length));
  }
  return result;
}

/**
 * Generate a full QR code with prefix
 * Example: "GEO-X7K2", "STAN-9RPM"
 */
export function generateQRCode(prefix: string): string {
  return `${prefix}-${generateRandomCodeSuffix()}`;
}

/**
 * Generate multiple unique QR codes
 * Returns array of unique codes, checking against existing codes
 */
export function generateUniqueQRCodes(
  prefix: string,
  count: number,
  existingCodes: Set<string>
): string[] {
  const newCodes: string[] = [];
  let attempts = 0;
  const maxAttempts = count * 100; // Safety limit

  while (newCodes.length < count && attempts < maxAttempts) {
    const code = generateQRCode(prefix);
    if (!existingCodes.has(code) && !newCodes.includes(code)) {
      newCodes.push(code);
    }
    attempts++;
  }

  return newCodes;
}
