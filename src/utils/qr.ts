import QRCode from 'qrcode';

/**
 * Generates the Linktree QR code (QR #1).
 * Error correction level: M
 * Width: 180px
 * Margin (quiet zone): 2 modules (~4mm)
 * Pure white background (#FFFFFF) with solid dark squares (#000000)
 */
export async function generateLinktreeQr(linktreeUrl: string): Promise<string> {
  return QRCode.toDataURL(linktreeUrl, {
    errorCorrectionLevel: 'M',
    width: 180,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

/**
 * Generates the Verification QR code (QR #2).
 * Error correction level: Q (higher resilience against wear & tear)
 * Width: 220px (noticeably larger than Linktree QR)
 * Margin (quiet zone): 2 modules (~4mm)
 * Pure white background (#FFFFFF) with solid dark squares (#000000)
 */
export async function generateVerificationQr(
  verificationBaseUrl: string,
  token: string
): Promise<string> {
  const base = verificationBaseUrl.trim();
  const fullUrl = base.includes('?t=') || base.endsWith('?t=') 
    ? `${base}${token}`
    : `${base.replace(/\/?$/, '')}/?t=${token}`;

  return QRCode.toDataURL(fullUrl, {
    errorCorrectionLevel: 'Q',
    width: 220,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}
