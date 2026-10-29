import JSZip from 'jszip';
import type { CashBatchSummary, CashCouponItem, CashPdfFileInfo } from '../types/coupon';
import { generateCashBatchSummaryJson, generateCashManifestCsv } from './cashCsv';

export interface CashZipProgressCallback {
  (percent: number, message: string): void;
}

const buildReadme = (summary: CashBatchSummary): string => {
  const tierLines = summary.tiers
    .map(
      (tier) =>
        `- Rs. ${tier.amount.toLocaleString('en-IN')} x ${tier.quantity} (${tier.codeStart} to ${tier.codeEnd})`
    )
    .join('\n');

  return [
    'FRESH MASALA CASH PRIZE COUPON BATCH',
    '====================================',
    '',
    `Batch ID: ${summary.batch_id}`,
    `Total coupons: ${summary.total_coupons}`,
    `Total payout value: Rs. ${summary.total_value.toLocaleString('en-IN')}`,
    `Generated at: ${summary.generated_at}`,
    '',
    'Prize tiers:',
    tierLines,
    '',
    'HOW TO USE',
    '1. Print the PDFs. Each tier is in its own folder.',
    '2. Each voucher is 15cm × 20cm (150mm × 200mm), printed with corner crop marks for clean trimming.',
    '3. In WordPress admin, open Cash Claims > Import and upload manifest.csv.',
    '4. Import the manifest BEFORE distributing the coupons.',
    '5. Keep manifest.csv private. It contains the secret claim tokens.',
    '',
    'The cash amount is not printed on the coupon. It is revealed on the claim page.',
    'The first complete claim submission wins. Payment is manual at the end of the day.',
    '',
  ].join('\n');
};

export const bundleCashBatchToZip = async (
  pdfFiles: CashPdfFileInfo[],
  coupons: CashCouponItem[],
  summary: CashBatchSummary,
  onProgress?: CashZipProgressCallback
): Promise<Blob> => {
  const zip = new JSZip();
  const folder = zip.folder(`coupons_${summary.batch_id}`);
  if (!folder) throw new Error('Failed to create ZIP folder');

  onProgress?.(4, 'Adding manifest.csv...');
  folder.file('manifest.csv', generateCashManifestCsv(coupons));

  onProgress?.(8, 'Adding batch-summary.json...');
  folder.file('batch-summary.json', generateCashBatchSummaryJson(summary));

  onProgress?.(12, 'Adding batch instructions...');
  folder.file('README.txt', buildReadme(summary));

  for (let i = 0; i < pdfFiles.length; i++) {
    const pdfFile = pdfFiles[i];
    const tierFolder = folder.folder(pdfFile.tierFolder);
    if (!tierFolder) throw new Error(`Failed to create ${pdfFile.tierFolder} folder`);

    const progressPct = Math.round(15 + (i / Math.max(pdfFiles.length, 1)) * 75);
    onProgress?.(progressPct, `Adding ${pdfFile.fileName} (${i + 1}/${pdfFiles.length})...`);
    tierFolder.file(pdfFile.fileName, await pdfFile.blob.arrayBuffer());

    if (i % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  onProgress?.(94, 'Compressing ZIP archive...');
  return zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(
        Math.round(94 + (metadata.percent / 100) * 6),
        `Finalizing ZIP: ${Math.round(metadata.percent)}%`
      );
    }
  );
};
