import QRCode from 'qrcode';

/**
 * Generates the Linktree QR code (QR #1).
 * Error correction level: M
 * Width: 180px
 * Margin (quiet zone): 2 modules (~4mm)
 * Pure white background (#FFFFFF) with solid dark squares (#000000)
 */
export const generateLinktreeQr = async (linktreeUrl: string): Promise<string> =>
  QRCode.toDataURL(linktreeUrl, {
    errorCorrectionLevel: 'M',
    width: 180,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

/**
 * Builds a token URL without corrupting existing query parameters.
 */
export const buildTokenUrl = (baseUrl: string, token: string): string => {
  const url = new URL(baseUrl.trim());
  url.searchParams.set('t', token);
  return url.toString();
};

/**
 * Generates the Verification QR code (QR #2).
 * Error correction level: Q (higher resilience against wear & tear)
 * Width: 220px (noticeably larger than Linktree QR)
 * Margin (quiet zone): 2 modules (~4mm)
 * Pure white background (#FFFFFF) with solid dark squares (#000000)
 */
export const generateVerificationQr = async (
  verificationBaseUrl: string,
  token: string
): Promise<string> =>
  QRCode.toDataURL(buildTokenUrl(verificationBaseUrl, token), {
    errorCorrectionLevel: 'Q',
    width: 220,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

/**
 * Generates the cash-claim QR. The token maps to the coupon row in WordPress.
 */
export const generateClaimQr = async (claimBaseUrl: string, token: string): Promise<string> =>
  QRCode.toDataURL(buildTokenUrl(claimBaseUrl, token), {
    errorCorrectionLevel: 'Q',
    width: 260,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
