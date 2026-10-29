import { jsPDF } from 'jspdf';
import type { CashCouponConfig, CashCouponItem, CashPdfFileInfo } from '../types/coupon';
import {
  CASH_CARD_HEIGHT_MM,
  CASH_CARD_WIDTH_MM,
  createCashCouponTemplate,
  renderCashCouponToCanvas,
} from './cashCouponCanvas';
import { generateClaimQr } from './qr';
import { generateSecureToken } from './security';
import { formatNpr } from './prizeAllocation';

export interface CashPdfProgressCallback {
  (generatedCount: number, totalCount: number, message: string): void;
}

// 15cm wide × 20cm tall centered on A4 (210mm × 297mm)
export const CASH_PAGE_WIDTH_MM = 210;
export const CASH_PAGE_HEIGHT_MM = 297;
export const CASH_MARGIN_LEFT = (CASH_PAGE_WIDTH_MM - CASH_CARD_WIDTH_MM) / 2; // 30 mm
export const CASH_MARGIN_TOP = (CASH_PAGE_HEIGHT_MM - CASH_CARD_HEIGHT_MM) / 2; // 48.5 mm
export const CASH_CARDS_PER_PAGE = 1;

const CASH_HEADER = 'Fresh Masala Cash Prize Voucher — 150mm × 200mm (15cm × 20cm)';

/**
 * Draw 4 corner crop marks around the 150mm × 200mm voucher on the A4 sheet.
 */
export const drawCashCropMarks = (pdf: jsPDF, subtitle?: string): void => {
  const tick = 6; // 6 mm tick mark length
  const gap = 1.5; // 1.5 mm offset from card corner
  const x1 = CASH_MARGIN_LEFT;
  const x2 = CASH_MARGIN_LEFT + CASH_CARD_WIDTH_MM;
  const y1 = CASH_MARGIN_TOP;
  const y2 = CASH_MARGIN_TOP + CASH_CARD_HEIGHT_MM;

  pdf.saveGraphicsState();
  pdf.setDrawColor(148, 163, 184); // Slate 400
  pdf.setLineWidth(0.25);

  // Top-left corner
  pdf.line(x1 - gap - tick, y1, x1 - gap, y1);
  pdf.line(x1, y1 - gap - tick, x1, y1 - gap);

  // Top-right corner
  pdf.line(x2 + gap, y1, x2 + gap + tick, y1);
  pdf.line(x2, y1 - gap - tick, x2, y1 - gap);

  // Bottom-left corner
  pdf.line(x1 - gap - tick, y2, x1 - gap, y2);
  pdf.line(x1, y2 + gap, x1, y2 + gap + tick);

  // Bottom-right corner
  pdf.line(x2 + gap, y2, x2 + gap + tick, y2);
  pdf.line(x2, y2 + gap, x2, y2 + gap + tick);

  // Header info in top margin
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  const headerText = subtitle ? `${CASH_HEADER} • ${subtitle}` : CASH_HEADER;
  pdf.text(headerText, CASH_PAGE_WIDTH_MM / 2, 20, { align: 'center' });

  // Cutting instruction in bottom margin
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text(
    'Trim along corner crop marks for exact 15cm × 20cm voucher dimensions',
    CASH_PAGE_WIDTH_MM / 2,
    CASH_PAGE_HEIGHT_MM - 15,
    { align: 'center' }
  );

  pdf.restoreGraphicsState();
};

const addVoucherToPage = (pdf: jsPDF, imageData: string): void => {
  pdf.addImage(
    imageData,
    'JPEG',
    CASH_MARGIN_LEFT,
    CASH_MARGIN_TOP,
    CASH_CARD_WIDTH_MM,
    CASH_CARD_HEIGHT_MM,
    undefined,
    'FAST'
  );
};

const createPdf = (): jsPDF =>
  new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

export const generateCashSamplePdf = async (
  config: CashCouponConfig,
  linktreeQrDataUrl: string
): Promise<Blob> => {
  const templateCanvas = await createCashCouponTemplate(
    config,
    config.includeLinktreeQr ? linktreeQrDataUrl : undefined
  );
  const pdf = createPdf();
  drawCashCropMarks(pdf, 'Sample Test Sheet');

  const sampleCode = `${config.couponPrefix || 'FM-'}${String(config.startingNumber || 1).padStart(5, '0')}`;
  const sampleToken = generateSecureToken();
  const claimQrDataUrl = await generateClaimQr(config.claimBaseUrl, sampleToken);
  const couponCanvas = await renderCashCouponToCanvas(templateCanvas, {
    couponCode: sampleCode,
    claimQrDataUrl,
  });

  addVoucherToPage(pdf, couponCanvas.toDataURL('image/jpeg', 0.92));

  return pdf.output('blob');
};

export const generateCashPdfFiles = async (
  config: CashCouponConfig,
  coupons: CashCouponItem[],
  linktreeQrDataUrl: string,
  onProgress?: CashPdfProgressCallback,
  checkCancelled?: () => boolean
): Promise<CashPdfFileInfo[]> => {
  const total = coupons.length;
  const pdfFiles: CashPdfFileInfo[] = [];
  const batchId = (config.batchId || 'CASH-BATCH').trim();
  const perFile = config.couponsPerPdf || 50;

  try {
    onProgress?.(0, total, 'Preparing cash-prize 15cm × 20cm template...');
    const templateCanvas = await createCashCouponTemplate(
      config,
      config.includeLinktreeQr ? linktreeQrDataUrl : undefined
    );

    let globalCouponIndex = 0;

    for (const tier of config.prizeTiers) {
      if (checkCancelled?.()) {
        throw new Error('Generation cancelled by user');
      }

      const tierCoupons = coupons.slice(globalCouponIndex, globalCouponIndex + tier.quantity);
      if (tierCoupons.length !== tier.quantity) {
        throw new Error(`Prize tier ${formatNpr(tier.amount)} has an inconsistent coupon count.`);
      }

      const tierFolder = `tier-${tier.amount}`;
      const numFiles = Math.ceil(tierCoupons.length / perFile);

      for (let fileIdx = 0; fileIdx < numFiles; fileIdx++) {
        if (checkCancelled?.()) {
          throw new Error('Generation cancelled by user');
        }

        const tierStart = fileIdx * perFile;
        const tierEnd = Math.min(tierStart + perFile, tierCoupons.length);
        const chunk = tierCoupons.slice(tierStart, tierEnd);
        const chunkGlobalStart = globalCouponIndex;
        const pageCount = chunk.length; // 1 card per page
        const fileName = `coupons_${batchId}_${tierFolder}_part-${String(fileIdx + 1).padStart(2, '0')}.pdf`;
        const pdf = createPdf();

        for (let page = 0; page < pageCount; page++) {
          if (checkCancelled?.()) {
            throw new Error('Generation cancelled by user');
          }

          if (page > 0) {
            pdf.addPage('a4', 'portrait');
          }
          drawCashCropMarks(pdf, `Sheet ${page + 1} of ${pageCount}`);

          const coupon = chunk[page];
          const claimQrDataUrl = await generateClaimQr(config.claimBaseUrl, coupon.qr_token);
          const couponCanvas = await renderCashCouponToCanvas(templateCanvas, {
            couponCode: coupon.coupon_code,
            claimQrDataUrl,
          });

          addVoucherToPage(pdf, couponCanvas.toDataURL('image/jpeg', 0.9));
          globalCouponIndex++;

          if (globalCouponIndex % 10 === 0 || globalCouponIndex === total) {
            onProgress?.(
              globalCouponIndex,
              total,
              `Generating ${formatNpr(tier.amount)} voucher ${globalCouponIndex} of ${total}...`
            );
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        const blob = pdf.output('blob');
        pdfFiles.push({
          fileName,
          startIndex: chunkGlobalStart + 1,
          endIndex: globalCouponIndex,
          couponCount: chunk.length,
          blob,
          url: URL.createObjectURL(blob),
          pageCount,
          tierAmount: tier.amount,
          tierFolder,
        });

        onProgress?.(
          globalCouponIndex,
          total,
          `Compiled ${fileName} (${formatNpr(tier.amount)} tier)...`
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    if (globalCouponIndex !== total) {
      throw new Error('The generated PDF count does not match the coupon count.');
    }

    onProgress?.(total, total, 'All cash-prize vouchers compiled.');
    return pdfFiles;
  } catch (error) {
    pdfFiles.forEach((file) => URL.revokeObjectURL(file.url));
    throw error;
  }
};
