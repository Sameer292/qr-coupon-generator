import { jsPDF } from 'jspdf';
import type { CouponConfig, CouponItem, GeneratedPdfFileInfo } from '../types/coupon';
import { createStaticCouponTemplate, renderCouponToCanvas } from './couponCanvas';
import { generateVerificationQr } from './qr';

// A4 dimensions in mm
export const PAGE_WIDTH_MM = 210;
export const PAGE_HEIGHT_MM = 297;

// Visiting Card coupon dimensions in mm
export const CARD_WIDTH_MM = 90;
export const CARD_HEIGHT_MM = 50;
export const GUTTER_X_MM = 5;
export const GUTTER_Y_MM = 5;

// Grid layout: 2 columns x 5 rows = 10 cards per page
export const COLS = 2;
export const ROWS = 5;
export const CARDS_PER_PAGE = COLS * ROWS; // 10

// Calculated margins for perfect page centering
const TOTAL_GRID_W = COLS * CARD_WIDTH_MM + (COLS - 1) * GUTTER_X_MM; // 185mm
const TOTAL_GRID_H = ROWS * CARD_HEIGHT_MM + (ROWS - 1) * GUTTER_Y_MM; // 270mm
export const MARGIN_LEFT = (PAGE_WIDTH_MM - TOTAL_GRID_W) / 2; // 12.5mm
export const MARGIN_TOP = (PAGE_HEIGHT_MM - TOTAL_GRID_H) / 2; // 13.5mm

/**
 * Draws print registration crop marks and cutting guides on an A4 page
 */
export function drawCropMarks(pdf: jsPDF, headerText?: string): void {
  pdf.setDrawColor(160, 160, 160);
  pdf.setLineWidth(0.15);
  pdf.setFontSize(7);
  pdf.setTextColor(130, 130, 130);

  // Top header text on margin
  pdf.text(
    headerText ||
      'Fresh Masala Promotional Coupons — Standard Visiting Card Size (90mm x 50mm) • 10 cards/page',
    PAGE_WIDTH_MM / 2,
    MARGIN_TOP - 5,
    { align: 'center' }
  );

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const x = MARGIN_LEFT + c * (CARD_WIDTH_MM + GUTTER_X_MM);
      const y = MARGIN_TOP + r * (CARD_HEIGHT_MM + GUTTER_Y_MM);
      const tick = 3; // 3mm tick

      // Top-left corner crop marks
      pdf.line(x - tick, y, x, y);
      pdf.line(x, y - tick, x, y);

      // Top-right corner crop marks
      pdf.line(x + CARD_WIDTH_MM, y, x + CARD_WIDTH_MM + tick, y);
      pdf.line(x + CARD_WIDTH_MM, y - tick, x + CARD_WIDTH_MM, y);

      // Bottom-left corner crop marks
      pdf.line(x - tick, y + CARD_HEIGHT_MM, x, y + CARD_HEIGHT_MM);
      pdf.line(x, y + CARD_HEIGHT_MM, x, y + CARD_HEIGHT_MM + tick);

      // Bottom-right corner crop marks
      pdf.line(x + CARD_WIDTH_MM, y + CARD_HEIGHT_MM, x + CARD_WIDTH_MM + tick, y + CARD_HEIGHT_MM);
      pdf.line(x + CARD_WIDTH_MM, y + CARD_HEIGHT_MM, x + CARD_WIDTH_MM + tick, y + CARD_HEIGHT_MM);
    }
  }

  // Footer page timestamp
  pdf.text(
    `Print at 100% Scale / Actual Size (Visiting Card Format: 90mm × 50mm) • Do Not Fit to Printable Area`,
    PAGE_WIDTH_MM / 2,
    PAGE_HEIGHT_MM - 4,
    { align: 'center' }
  );
}

export interface PdfGenerationProgressCallback {
  (generatedCount: number, totalCount: number, message: string): void;
}

/**
 * Generates a single sample PDF (1 page with up to 10 sample coupons) for visual test and print validation.
 */
export async function generateSamplePdf(
  config: CouponConfig,
  linktreeQrDataUrl: string
): Promise<Blob> {
  const templateCanvas = await createStaticCouponTemplate(config, linktreeQrDataUrl);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  drawCropMarks(pdf);

  // Generate 10 sample coupons
  for (let i = 0; i < 10; i++) {
    const codeNumber = config.startingNumber + i;
    const sampleCode = `${config.couponPrefix}${String(codeNumber).padStart(5, '0')}`;
    const sampleToken = `sample_token_${String(codeNumber).padStart(5, '0')}_test_12345678`;
    const verifQrDataUrl = await generateVerificationQr(config.verificationBaseUrl, sampleToken);

    const couponCanvas = await renderCouponToCanvas(
      templateCanvas,
      {
        couponCode: sampleCode,
        verificationQrDataUrl: verifQrDataUrl,
      },
      config.layout
    );

    const imgData = couponCanvas.toDataURL('image/jpeg', 0.92);

    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = MARGIN_LEFT + col * (CARD_WIDTH_MM + GUTTER_X_MM);
    const y = MARGIN_TOP + row * (CARD_HEIGHT_MM + GUTTER_Y_MM);

    pdf.addImage(imgData, 'JPEG', x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM, undefined, 'FAST');
  }

  return pdf.output('blob');
}

/**
 * Builds multi-file split PDFs in chunks according to couponsPerPdf setting.
 * Yields periodically to the event loop so the tab remains responsive.
 */
export async function generateAllPdfFiles(
  config: CouponConfig,
  coupons: CouponItem[],
  linktreeQrDataUrl: string,
  onProgress?: PdfGenerationProgressCallback,
  checkCancelled?: () => boolean
): Promise<GeneratedPdfFileInfo[]> {
  const total = coupons.length;
  const perFile = config.couponsPerPdf;
  const numFiles = Math.ceil(total / perFile);
  const pdfFiles: GeneratedPdfFileInfo[] = [];

  try {
    // Pre-render static template ONCE for maximum performance
    onProgress?.(0, total, 'Preparing high-resolution coupon template...');
  const templateCanvas = await createStaticCouponTemplate(config, linktreeQrDataUrl);

  let globalCouponIndex = 0;

  for (let fileIdx = 0; fileIdx < numFiles; fileIdx++) {
    if (checkCancelled?.()) {
      throw new Error('Generation cancelled by user');
    }

    const startIdx = fileIdx * perFile;
    const endIdx = Math.min(startIdx + perFile, total);
    const countInThisFile = endIdx - startIdx;
    const totalPagesInThisFile = Math.ceil(countInThisFile / CARDS_PER_PAGE);

    // Format file name: coupons_BATCH-2026-01_0001-0250.pdf
    const startStr = String(startIdx + 1).padStart(4, '0');
    const endStr = String(endIdx).padStart(4, '0');
    const fileName = `coupons_${config.batchId}_${startStr}-${endStr}.pdf`;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let p = 0; p < totalPagesInThisFile; p++) {
      if (p > 0) {
        pdf.addPage('a4', 'portrait');
      }
      drawCropMarks(pdf);

      const pageStart = startIdx + p * CARDS_PER_PAGE;
      const pageEnd = Math.min(pageStart + CARDS_PER_PAGE, endIdx);

      for (let i = pageStart; i < pageEnd; i++) {
        if (checkCancelled?.()) {
          throw new Error('Generation cancelled by user');
        }

        const coupon = coupons[i];
        const verifQrDataUrl = await generateVerificationQr(config.verificationBaseUrl, coupon.qr_token);

        const couponCanvas = await renderCouponToCanvas(
          templateCanvas,
          {
            couponCode: coupon.coupon_code,
            verificationQrDataUrl: verifQrDataUrl,
          },
          config.layout
        );

        const imgData = couponCanvas.toDataURL('image/jpeg', 0.90);

        const cardIndexOnPage = i - pageStart;
        const col = cardIndexOnPage % COLS;
        const row = Math.floor(cardIndexOnPage / COLS);
        const x = MARGIN_LEFT + col * (CARD_WIDTH_MM + GUTTER_X_MM);
        const y = MARGIN_TOP + row * (CARD_HEIGHT_MM + GUTTER_Y_MM);

        pdf.addImage(imgData, 'JPEG', x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM, undefined, 'FAST');

        globalCouponIndex++;

        // Yield to event loop every 50 coupons to prevent UI freeze
        if (globalCouponIndex % 50 === 0) {
          onProgress?.(
            globalCouponIndex,
            total,
            `Generating coupon ${globalCouponIndex} of ${total} (File ${fileIdx + 1}/${numFiles})...`
          );
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    }

    onProgress?.(
      globalCouponIndex,
      total,
      `Compiling PDF ${fileIdx + 1} of ${numFiles} (${fileName})...`
    );

    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);

    pdfFiles.push({
      fileName,
      startIndex: startIdx + 1,
      endIndex: endIdx,
      couponCount: countInThisFile,
      blob,
      url,
      pageCount: totalPagesInThisFile,
    });

    // Short yield after completing a file
    await new Promise((r) => setTimeout(r, 0));
  }

    return pdfFiles;
  } catch (error) {
    pdfFiles.forEach((file) => URL.revokeObjectURL(file.url));
    throw error;
  }
}
