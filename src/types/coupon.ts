export interface CouponElementPosition {
  x: number;
  y: number;
}

export interface CouponLayoutConfig {
  logo: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  phone: {
    x: number;
    y: number;
    waFontSize: number;
    landlineFontSize: number;
  };
  linktreeQr: {
    x: number;
    y: number;
    size: number;
    captionFontSize: number;
  };
  header: {
    x: number;
    y: number;
    titleFontSize: number;
    underlineWidth: number;
    subtitleY: number;
    subtitleFontSize: number;
  };
  couponBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    labelFontSize: number;
    codeFontSize: number;
  };
  footer: {
    safeTextY: number;
    safeTextFontSize: number;
    batchY: number;
    batchFontSize: number;
    campaignY: number;
    campaignFontSize: number;
  };
  verificationQr: {
    x: number;
    y: number;
    size: number;
    badgeFontSize: number;
  };
  activationBanner: {
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    subtextY: number;
    subtextFontSize: number;
  };
}

export const DEFAULT_LAYOUT_CONFIG: CouponLayoutConfig = {
  logo: {
    x: 170,
    y: 24,
    width: 310,
    height: 135,
  },
  phone: {
    x: 170,
    y: 175,
    waFontSize: 25,
    landlineFontSize: 23,
  },
  linktreeQr: {
    x: 170,
    y: 238,
    size: 228,
    captionFontSize: 20,
  },
  header: {
    x: 522,
    y: 76,
    titleFontSize: 44,
    underlineWidth: 350,
    subtitleY: 142,
    subtitleFontSize: 22,
  },
  couponBox: {
    x: 522,
    y: 176,
    width: 360,
    height: 150,
    labelFontSize: 18,
    codeFontSize: 62,
  },
  footer: {
    safeTextY: 400,
    safeTextFontSize: 21,
    batchY: 444,
    batchFontSize: 18,
    campaignY: 486,
    campaignFontSize: 14,
  },
  verificationQr: {
    x: 890,
    y: 104,
    size: 245,
    badgeFontSize: 15,
  },
  activationBanner: {
    x: 890,
    y: 371,
    width: 285,
    height: 46,
    fontSize: 17,
    subtextY: 445,
    subtextFontSize: 18,
  },
};

export interface CouponConfig {
  logoDataUrl: string;
  phoneNumber: string;
  landlineNumber?: string;
  linktreeUrl: string;
  verificationBaseUrl: string;
  couponPrefix: string;
  startingNumber: number;
  totalQuantity: number;
  batchId: string;
  couponsPerPdf: 100 | 250 | 500;
  layout?: CouponLayoutConfig;
}

export interface CouponItem {
  coupon_code: string;
  qr_token: string;
  batch_id: string;
  generated_at: string;
}

export interface ValidationErrors {
  logoDataUrl?: string;
  phoneNumber?: string;
  landlineNumber?: string;
  linktreeUrl?: string;
  verificationBaseUrl?: string;
  couponPrefix?: string;
  startingNumber?: string;
  totalQuantity?: string;
  batchId?: string;
  couponsPerPdf?: string;
}

export interface GenerationProgress {
  status: 'idle' | 'generating' | 'completed' | 'cancelled' | 'error';
  currentCount: number;
  totalCount: number;
  currentStep: string;
  percent: number;
  startTime?: number;
  elapsedSeconds?: number;
  estimatedRemainingSeconds?: number;
  error?: string;
}

export interface SelfCheckResult {
  passed: boolean;
  totalRequested: number;
  totalGenerated: number;
  uniqueCodesCount: number;
  uniqueTokensCount: number;
  invalidTokenLengthCount: number;
  codeDuplicates: number;
  tokenDuplicates: number;
  timestampUniform: boolean;
}

export interface GeneratedBatchData {
  config: CouponConfig;
  coupons: CouponItem[];
  generatedAt: string;
  linktreeQrDataUrl: string;
  selfCheck: SelfCheckResult;
}

export interface GeneratedPdfFileInfo {
  fileName: string;
  startIndex: number;
  endIndex: number;
  couponCount: number;
  blob: Blob;
  url: string;
  pageCount: number;
}

export type CampaignMode = 'draw' | 'cash';

export interface PrizeTier {
  id: string;
  amount: number;
  quantity: number;
}

export interface CashCouponConfig {
  logoDataUrl: string;
  phoneNumber: string;
  landlineNumber?: string;
  linktreeUrl: string;
  claimBaseUrl: string;
  couponPrefix: string;
  startingNumber: number;
  batchId: string;
  couponsPerPdf: number;
  prizeTiers: PrizeTier[];
  includeLinktreeQr: boolean;
}

export interface CashCouponItem {
  coupon_code: string;
  qr_token: string;
  batch_id: string;
  prize_amount: number;
  currency: 'NPR';
  generated_at: string;
}

export interface CashTierSummary {
  amount: number;
  quantity: number;
  codeStart: string;
  codeEnd: string;
  totalValue: number;
}

export interface CashBatchSummary {
  batch_id: string;
  currency: 'NPR';
  total_coupons: number;
  total_value: number;
  generated_at: string;
  tiers: CashTierSummary[];
}

export interface CashValidationErrors {
  logoDataUrl?: string;
  phoneNumber?: string;
  landlineNumber?: string;
  linktreeUrl?: string;
  claimBaseUrl?: string;
  couponPrefix?: string;
  startingNumber?: string;
  batchId?: string;
  couponsPerPdf?: string;
  prizeTiers?: string;
  tierErrors?: Record<string, { amount?: string; quantity?: string }>;
}

export interface CashSelfCheckResult {
  passed: boolean;
  totalRequested: number;
  totalGenerated: number;
  uniqueCodesCount: number;
  uniqueTokensCount: number;
  invalidTokenLengthCount: number;
  codeDuplicates: number;
  tokenDuplicates: number;
  timestampUniform: boolean;
  tierCountsMatch: boolean;
  totalValue: number;
  expectedTotalValue: number;
  invalidPrizeAmountCount: number;
  groupingValid: boolean;
}

export interface CashGeneratedBatchData {
  config: CashCouponConfig;
  coupons: CashCouponItem[];
  generatedAt: string;
  linktreeQrDataUrl: string;
  selfCheck: CashSelfCheckResult;
  summary: CashBatchSummary;
}

export interface CashPdfFileInfo extends GeneratedPdfFileInfo {
  tierAmount: number;
  tierFolder: string;
}
