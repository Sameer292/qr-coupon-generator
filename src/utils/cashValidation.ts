import type { CashCouponConfig, CashValidationErrors } from '../types/coupon';

export const MAX_CASH_COUPONS = 20000;
export const MAX_PRIZE_AMOUNT = 10000000;
export const MAX_COUPON_CODE_LENGTH = 30;
export const MAX_BATCH_ID_LENGTH = 50;

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// eslint-disable-next-line no-control-regex
const hasControlCharacters = (value: string): boolean => /[\u0000-\u001F\u007F]/.test(value);

export const validateCashConfig = (
  config: CashCouponConfig
): { isValid: boolean; errs: CashValidationErrors } => {
  const errs: CashValidationErrors = {};
  const tierErrors: Record<string, { amount?: string; quantity?: string }> = {};

  if (!config.logoDataUrl) {
    errs.logoDataUrl = 'Logo image is required.';
  }

  if (!config.phoneNumber.trim()) {
    errs.phoneNumber = 'Business phone number is required.';
  }

  if (config.includeLinktreeQr) {
    if (!config.linktreeUrl.trim()) {
      errs.linktreeUrl = 'Linktree URL is required when the follow QR is enabled.';
    } else if (!isHttpUrl(config.linktreeUrl)) {
      errs.linktreeUrl = 'Must be a valid URL starting with http:// or https://';
    }
  }

  if (!config.claimBaseUrl.trim()) {
    errs.claimBaseUrl = 'Claim page URL is required.';
  } else if (!isHttpUrl(config.claimBaseUrl)) {
    errs.claimBaseUrl = 'Must be a valid URL starting with http:// or https://';
  }

  const couponPrefix = config.couponPrefix.trim();
  if (!couponPrefix) {
    errs.couponPrefix = 'Coupon code prefix is required (e.g. FM-).';
  } else if (config.couponPrefix !== couponPrefix) {
    errs.couponPrefix = 'Coupon code prefix cannot start or end with a space.';
  } else if (!/^[A-Za-z0-9_-]+$/.test(couponPrefix)) {
    errs.couponPrefix = 'Use only letters, numbers, hyphens, and underscores.';
  }

  if (
    !Number.isSafeInteger(config.startingNumber) ||
    config.startingNumber < 1
  ) {
    errs.startingNumber = 'Starting sequence number must be a whole number of 1 or greater.';
  }

  const batchId = config.batchId.trim();
  if (!batchId) {
    errs.batchId = 'Batch ID is required (e.g. CASH-2026-01).';
  } else if (config.batchId !== batchId) {
    errs.batchId = 'Batch ID cannot start or end with a space.';
  } else if (batchId.length > MAX_BATCH_ID_LENGTH) {
    errs.batchId = `Batch ID cannot exceed ${MAX_BATCH_ID_LENGTH} characters.`;
  } else if (/[\\/]/.test(batchId) || hasControlCharacters(batchId)) {
    errs.batchId = 'Batch ID cannot contain slashes or control characters.';
  }

  if (![100, 250, 500].includes(config.couponsPerPdf)) {
    errs.couponsPerPdf = 'Choose 100, 250, or 500 coupons per PDF.';
  }

  if (config.prizeTiers.length === 0) {
    errs.prizeTiers = 'Add at least one cash prize tier.';
  }

  const seenAmounts = new Set<number>();
  let totalQuantity = 0;

  for (const tier of config.prizeTiers) {
    const current: { amount?: string; quantity?: string } = {};

    if (!Number.isInteger(tier.amount) || tier.amount <= 0) {
      current.amount = 'Prize must be a whole number greater than 0.';
    } else if (tier.amount > MAX_PRIZE_AMOUNT) {
      current.amount = `Prize cannot exceed Rs. ${MAX_PRIZE_AMOUNT.toLocaleString('en-IN')}.`;
    } else if (seenAmounts.has(tier.amount)) {
      current.amount = 'Each prize amount can only appear once.';
    } else {
      seenAmounts.add(tier.amount);
    }

    if (!Number.isInteger(tier.quantity) || tier.quantity <= 0) {
      current.quantity = 'Quantity must be a whole number greater than 0.';
    } else {
      totalQuantity += tier.quantity;
    }

    if (current.amount || current.quantity) {
      tierErrors[tier.id] = current;
    }
  }

  if (totalQuantity > MAX_CASH_COUPONS) {
    errs.prizeTiers = `Total coupons cannot exceed ${MAX_CASH_COUPONS.toLocaleString()}.`;
  }

  if (
    !errs.couponPrefix &&
    !errs.startingNumber &&
    totalQuantity > 0 &&
    Number.isSafeInteger(config.startingNumber)
  ) {
    const lastSequence = config.startingNumber + totalQuantity - 1;
    const longestCode = `${couponPrefix}${String(lastSequence).padStart(5, '0')}`;
    if (longestCode.length > MAX_COUPON_CODE_LENGTH) {
      errs.couponPrefix = `The longest coupon code is ${longestCode.length} characters. Keep it at ${MAX_COUPON_CODE_LENGTH} or fewer.`;
    }
  }

  if (Object.keys(tierErrors).length > 0) {
    errs.tierErrors = tierErrors;
    errs.prizeTiers = errs.prizeTiers || 'Fix the highlighted prize tiers.';
  }

  return {
    isValid: Object.keys(errs).length === 0,
    errs,
  };
};
