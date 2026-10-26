import type { CouponItem, SelfCheckResult } from '../types/coupon';

/**
 * Converts a Uint8Array buffer into a standard Base64 string safely in both browser and runtime environments.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa !== 'undefined') {
    return btoa(binary);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

/**
 * Generates a cryptographically secure, 32-character URL-safe random token.
 * Uses Web Crypto API crypto.getRandomValues(new Uint8Array(24)).
 * Encodes to Base64URL (+ -> -, / -> _, strip '=' padding) and truncates to 32 chars.
 */
export function generateSecureToken(): string {
  const randomBytes = new Uint8Array(24);
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  cryptoObj.getRandomValues(randomBytes);
  
  const base64 = uint8ArrayToBase64(randomBytes);
  const base64Url = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  return base64Url.slice(0, 32);
}

/**
 * Generates a unique secure token guaranteed not to collide with existing tokens in the Set.
 */
export function generateUniqueToken(existingTokens: Set<string>): string {
  let token = generateSecureToken();
  while (existingTokens.has(token) || token.length !== 32) {
    token = generateSecureToken();
  }
  existingTokens.add(token);
  return token;
}

/**
 * Rigorous self-check verification for all generated coupons before allowing export.
 * Checks total count, coupon code uniqueness, token uniqueness, token length (32),
 * and uniform ISO timestamp.
 */
export function performSelfCheck(coupons: CouponItem[], expectedTotal: number): SelfCheckResult {
  const totalGenerated = coupons.length;
  const codeSet = new Set<string>();
  const tokenSet = new Set<string>();
  
  let invalidTokenLengthCount = 0;
  let codeDuplicates = 0;
  let tokenDuplicates = 0;
  
  const firstTimestamp = coupons.length > 0 ? coupons[0].generated_at : '';
  let timestampUniform = true;

  for (const coupon of coupons) {
    // Check code duplication
    if (codeSet.has(coupon.coupon_code)) {
      codeDuplicates++;
    } else {
      codeSet.add(coupon.coupon_code);
    }

    // Check token duplication
    if (tokenSet.has(coupon.qr_token)) {
      tokenDuplicates++;
    } else {
      tokenSet.add(coupon.qr_token);
    }

    // Check token length & URL safe format
    if (coupon.qr_token.length !== 32 || !/^[A-Za-z0-9_-]{32}$/.test(coupon.qr_token)) {
      invalidTokenLengthCount++;
    }

    // Check timestamp uniformity
    if (coupon.generated_at !== firstTimestamp) {
      timestampUniform = false;
    }
  }

  const passed =
    totalGenerated === expectedTotal &&
    codeDuplicates === 0 &&
    tokenDuplicates === 0 &&
    invalidTokenLengthCount === 0 &&
    timestampUniform;

  return {
    passed,
    totalRequested: expectedTotal,
    totalGenerated,
    uniqueCodesCount: codeSet.size,
    uniqueTokensCount: tokenSet.size,
    invalidTokenLengthCount,
    codeDuplicates,
    tokenDuplicates,
    timestampUniform,
  };
}
