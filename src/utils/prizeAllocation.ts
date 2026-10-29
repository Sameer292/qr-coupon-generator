import type {
  CashBatchSummary,
  CashCouponConfig,
  CashCouponItem,
  CashSelfCheckResult,
  PrizeTier,
} from '../types/coupon';
import { generateUniqueToken } from './security';
import { MAX_CASH_COUPONS } from './cashValidation';

export const CASH_CURRENCY = 'NPR' as const;

export type CashGenerationProgress = (
  currentCount: number,
  totalCount: number,
  message: string
) => void;

export const getTotalPrizeQuantity = (tiers: PrizeTier[]): number =>
  tiers.reduce((total, tier) => total + Math.max(0, tier.quantity || 0), 0);

export const getTotalPrizeValue = (tiers: PrizeTier[]): number =>
  tiers.reduce(
    (total, tier) => total + Math.max(0, tier.amount || 0) * Math.max(0, tier.quantity || 0),
    0
  );

export const formatNpr = (amount: number): string =>
  `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`;

export const buildCashCoupons = (
  config: CashCouponConfig,
  onProgress?: CashGenerationProgress,
  checkCancelled?: () => boolean
): CashCouponItem[] => {
  const total = getTotalPrizeQuantity(config.prizeTiers);

  if (total < 1) {
    throw new Error('The prize tiers do not contain any coupons.');
  }
  if (total > MAX_CASH_COUPONS) {
    throw new Error(`Total coupons cannot exceed ${MAX_CASH_COUPONS.toLocaleString()}.`);
  }

  const generatedAt = new Date().toISOString();
  const existingTokens = new Set<string>();
  const coupons: CashCouponItem[] = [];
  const couponPrefix = config.couponPrefix.trim();
  const batchId = config.batchId.trim();
  let sequence = config.startingNumber;
  let generated = 0;

  for (const tier of config.prizeTiers) {
    for (let tierIndex = 0; tierIndex < tier.quantity; tierIndex++) {
      if (checkCancelled?.()) {
        throw new Error('Generation cancelled by user');
      }

      const couponCode = `${couponPrefix}${String(sequence).padStart(5, '0')}`;
      const qrToken = generateUniqueToken(existingTokens);

      coupons.push({
        coupon_code: couponCode,
        qr_token: qrToken,
        batch_id: batchId,
        prize_amount: tier.amount,
        currency: CASH_CURRENCY,
        generated_at: generatedAt,
      });

      sequence += 1;
      generated += 1;

      if (generated % 500 === 0) {
        onProgress?.(generated, total, `Allocating prize tier ${formatNpr(tier.amount)}...`);
      }
    }
  }

  onProgress?.(generated, total, 'Prize allocation complete.');
  return coupons;
};

export const buildCashBatchSummary = (
  config: CashCouponConfig,
  coupons: CashCouponItem[],
  generatedAt: string
): CashBatchSummary => {
  const tiers = config.prizeTiers.map((tier) => {
    const tierCoupons = coupons.filter((coupon) => coupon.prize_amount === tier.amount);
    const first = tierCoupons[0];
    const last = tierCoupons[tierCoupons.length - 1];

    return {
      amount: tier.amount,
      quantity: tierCoupons.length,
      codeStart: first?.coupon_code || '',
      codeEnd: last?.coupon_code || '',
      totalValue: tier.amount * tierCoupons.length,
    };
  });

  return {
    batch_id: config.batchId.trim(),
    currency: CASH_CURRENCY,
    total_coupons: coupons.length,
    total_value: coupons.reduce((total, coupon) => total + coupon.prize_amount, 0),
    generated_at: generatedAt,
    tiers,
  };
};

export const performCashSelfCheck = (
  coupons: CashCouponItem[],
  expectedTotal: number,
  tiers: PrizeTier[]
): CashSelfCheckResult => {
  const totalGenerated = coupons.length;
  const codeSet = new Set<string>();
  const tokenSet = new Set<string>();
  const tierCounts = new Map<number, number>();
  const tierOrder = new Map<number, number>();

  tiers.forEach((tier, index) => {
    tierOrder.set(tier.amount, index);
  });

  let invalidTokenLengthCount = 0;
  let codeDuplicates = 0;
  let tokenDuplicates = 0;
  let invalidPrizeAmountCount = 0;
  let groupingValid = true;
  let lastTierIndex = -1;

  const firstTimestamp = coupons.length > 0 ? coupons[0].generated_at : '';
  let timestampUniform = true;

  for (const coupon of coupons) {
    if (codeSet.has(coupon.coupon_code)) {
      codeDuplicates++;
    } else {
      codeSet.add(coupon.coupon_code);
    }

    if (tokenSet.has(coupon.qr_token)) {
      tokenDuplicates++;
    } else {
      tokenSet.add(coupon.qr_token);
    }

    if (coupon.qr_token.length !== 32 || !/^[A-Za-z0-9_-]{32}$/.test(coupon.qr_token)) {
      invalidTokenLengthCount++;
    }

    if (!Number.isInteger(coupon.prize_amount) || coupon.prize_amount <= 0) {
      invalidPrizeAmountCount++;
    }

    tierCounts.set(coupon.prize_amount, (tierCounts.get(coupon.prize_amount) || 0) + 1);

    const tierIndex = tierOrder.get(coupon.prize_amount);
    if (tierIndex === undefined || tierIndex < lastTierIndex) {
      groupingValid = false;
    } else {
      lastTierIndex = tierIndex;
    }

    if (coupon.generated_at !== firstTimestamp) {
      timestampUniform = false;
    }
  }

  const tierCountsMatch = tiers.every(
    (tier) => (tierCounts.get(tier.amount) || 0) === tier.quantity
  );
  const expectedTotalValue = getTotalPrizeValue(tiers);
  const totalValue = coupons.reduce((total, coupon) => total + coupon.prize_amount, 0);

  const passed =
    totalGenerated === expectedTotal &&
    codeDuplicates === 0 &&
    tokenDuplicates === 0 &&
    invalidTokenLengthCount === 0 &&
    timestampUniform &&
    tierCountsMatch &&
    invalidPrizeAmountCount === 0 &&
    groupingValid &&
    totalValue === expectedTotalValue;

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
    tierCountsMatch,
    totalValue,
    expectedTotalValue,
    invalidPrizeAmountCount,
    groupingValid,
  };
};
