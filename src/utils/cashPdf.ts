import { jsPDF } from 'jspdf';
import type { CashCouponConfig, CashCouponItem, CashPdfFileInfo } from '../types/coupon';
import {
  CARD_HEIGHT_MM,
  CARD_WIDTH_MM,
  CARDS_PER_PAGE,
  COLS,
  GUTTER_X_MM,
  GUTTER_Y_MM,
  MARGIN_LEFT,
  MARGIN_TOP,
  drawCropMarks,
} from './pdf';
import { createCashCouponTemplate, renderCashCouponToCanvas } from './cashCouponCanvas';
import { generateClaimQr } from './qr';
import { generateSecureToken } from './security';
import { formatNpr } from './prizeAllocation';

export interface CashPdfProgressCallback {
  (generatedCount: number, totalCount: number, message: string): void;
}

const CASH_HEADER = 'Fresh Masala Cash Prize Coupons — 90mm x 50mm • 10 cards/page';

const addCardToPage = (
  pdf: jsPDF,
  imageData: string,
  cardIndexOnPage: number
): void => {
  const col = cardIndexOnPage % COLS;
  const row = Math.floor(cardIndexOnPage / COLS);
  const x = MARGIN_LEFT + col * (CARD_WIDTH_MM + GUTTER_X_MM);
  const y = MARGIN_TOP + row * (CARD_HEIGHT_MM + GUTTER_Y_MM);
  pdf.addImage(imageData, 'JPEG', x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM, undefined, 'FAST');
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
  drawCropMarks(pdf, `Sample — ${CASH_HEADER}`);

  for (let i = 0; i < 10; i++) {
    const sampleCode = `${config.couponPrefix}${String(config.startingNumber + i).padStart(5, '0')}`;
    const sampleToken = generateSecureToken();
    const claimQrDataUrl = await generateClaimQr(config.claimBaseUrl, sampleToken);
    const couponCanvas = await renderCashCouponToCanvas(templateCanvas, {
      couponCode: sampleCode,
      claimQrDataUrl,
    });
    addCardToPage(pdf, couponCanvas.toDataURL('image/jpeg', 0.92), i);
  }

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
  const batchId = config.batchId.trim();

  try {
    onProgress?.(0, total, 'Preparing cash-prize coupon template...');
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
      const numFiles = Math.ceil(tierCoupons.length / config.couponsPerPdf);

      for (let fileIdx = 0; fileIdx < numFiles; fileIdx++) {
        if (checkCancelled?.()) {
          throw new Error('Generation cancelled by user');
        }

        const tierStart = fileIdx * config.couponsPerPdf;
        const tierEnd = Math.min(tierStart + config.couponsPerPdf, tierCoupons.length);
        const chunk = tierCoupons.slice(tierStart, tierEnd);
        const chunkGlobalStart = globalCouponIndex;
        const pageCount = Math.ceil(chunk.length / CARDS_PER_PAGE);
        const fileName = `coupons_${batchId}_${tierFolder}_part-${String(fileIdx + 1).padStart(2, '0')}.pdf`;
        const pdf = createPdf();

        for (let page = 0; page < pageCount; page++) {
          if (page > 0) {
            pdf.addPage('a4', 'portrait');
          }
          drawCropMarks(pdf, `${CASH_HEADER} • ${formatNpr(tier.amount)} tier`);

          const pageStart = page * CARDS_PER_PAGE;
          const pageEnd = Math.min(pageStart + CARDS_PER_PAGE, chunk.length);

          for (let index = pageStart; index < pageEnd; index++) {
            if (checkCancelled?.()) {
              throw new Error('Generation cancelled by user');
            }

            const coupon = chunk[index];
            const claimQrDataUrl = await generateClaimQr(config.claimBaseUrl, coupon.qr_token);
            const couponCanvas = await renderCashCouponToCanvas(templateCanvas, {
              couponCode: coupon.coupon_code,
              claimQrDataUrl,
            });
            addCardToPage(pdf, couponCanvas.toDataURL('image/jpeg', 0.9), index - pageStart);
            globalCouponIndex++;

            if (globalCouponIndex % 50 === 0) {
              onProgress?.(
                globalCouponIndex,
                total,
                `Generating ${formatNpr(tier.amount)} coupon ${globalCouponIndex} of ${total}...`
              );
              await new Promise((resolve) => setTimeout(resolve, 0));
            }
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

    onProgress?.(total, total, 'All cash-prize PDFs compiled.');
    return pdfFiles;
  } catch (error) {
    pdfFiles.forEach((file) => URL.revokeObjectURL(file.url));
    throw error;
  }
};
