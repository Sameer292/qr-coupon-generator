import type { CouponItem } from '../types/coupon';

/**
 * Escapes a CSV cell value according to RFC 4180:
 * Quotes the string if it contains a comma, double-quote, or newline.
 */
function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generates the strict manifest.csv string matching the required schema:
 * coupon_code,qr_token,batch_id,generated_at
 * UTF-8 without BOM, Unix line endings (\n).
 */
export function generateManifestCsv(coupons: CouponItem[]): string {
  const header = 'coupon_code,qr_token,batch_id,generated_at';
  const rows = coupons.map((c) => {
    return [
      escapeCsvCell(c.coupon_code),
      escapeCsvCell(c.qr_token),
      escapeCsvCell(c.batch_id),
      escapeCsvCell(c.generated_at),
    ].join(',');
  });

  return [header, ...rows].join('\n') + '\n';
}

/**
 * Triggers a browser download for the generated CSV string as manifest.csv
 */

export function downloadManifestCsv(coupons: CouponItem[], fileName = 'manifest.csv'): void {
  const csvContent = generateManifestCsv(coupons);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
