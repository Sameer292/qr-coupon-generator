import type { CashBatchSummary, CashCouponItem } from '../types/coupon';
import { escapeCsvCell } from './csv';

export const CASH_MANIFEST_HEADER =
  'coupon_code,qr_token,batch_id,prize_amount,currency,generated_at';

export const generateCashManifestCsv = (coupons: CashCouponItem[]): string => {
  const rows = coupons.map((coupon) =>
    [
      escapeCsvCell(coupon.coupon_code),
      escapeCsvCell(coupon.qr_token),
      escapeCsvCell(coupon.batch_id),
      escapeCsvCell(String(coupon.prize_amount)),
      escapeCsvCell(coupon.currency),
      escapeCsvCell(coupon.generated_at),
    ].join(',')
  );

  return [CASH_MANIFEST_HEADER, ...rows].join('\n') + '\n';
};

export const generateCashBatchSummaryJson = (summary: CashBatchSummary): string =>
  JSON.stringify(summary, null, 2) + '\n';

const downloadTextFile = (content: string, fileName: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadCashManifestCsv = (
  coupons: CashCouponItem[],
  fileName = 'manifest.csv'
): void => {
  downloadTextFile(generateCashManifestCsv(coupons), fileName, 'text/csv;charset=utf-8;');
};

export const downloadCashBatchSummaryJson = (
  summary: CashBatchSummary,
  fileName = 'batch-summary.json'
): void => {
  downloadTextFile(
    generateCashBatchSummaryJson(summary),
    fileName,
    'application/json;charset=utf-8;'
  );
};
