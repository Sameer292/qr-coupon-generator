import JSZip from 'jszip';
import type { GeneratedPdfFileInfo, CouponItem } from '../types/coupon';
import { generateManifestCsv } from './csv';

export interface ZipProgressCallback {
  (percent: number, message: string): void;
}

/**
 * Bundles all generated PDF files and the manifest CSV into a single ZIP archive.
 */
export async function bundlePdfsToZip(
  pdfFiles: GeneratedPdfFileInfo[],
  coupons: CouponItem[],
  batchId: string,
  onProgress?: ZipProgressCallback
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(`coupons_${batchId}`);

  if (!folder) {
    throw new Error('Failed to create ZIP folder');
  }

  // Add CSV manifest to root of zip
  onProgress?.(5, 'Adding manifest.csv to ZIP bundle...');
  const csvContent = generateManifestCsv(coupons);
  folder.file('manifest.csv', csvContent);

  // Add all PDF files
  for (let i = 0; i < pdfFiles.length; i++) {
    const pdfFile = pdfFiles[i];
    const progressPct = Math.round(10 + (i / pdfFiles.length) * 80);
    onProgress?.(progressPct, `Adding ${pdfFile.fileName} (${i + 1}/${pdfFiles.length})...`);
    
    // Add PDF blob as array buffer
    const arrayBuffer = await pdfFile.blob.arrayBuffer();
    folder.file(pdfFile.fileName, arrayBuffer);
    
    // Yield to avoid freezing
    if (i % 5 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress?.(95, 'Compressing ZIP archive...');
  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(Math.round(95 + (metadata.percent / 100) * 5), `Finalizing ZIP: ${Math.round(metadata.percent)}%`);
    }
  );

  return zipBlob;
}

/**
 * Triggers download for the ZIP Blob
 */
export function downloadZipBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
