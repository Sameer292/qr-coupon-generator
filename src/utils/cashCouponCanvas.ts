import type { CashCouponConfig } from '../types/coupon';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  LANDLINE_ICON_DATA_URL,
  WHATSAPP_ICON_DATA_URL,
  drawRoundedRect,
  loadImage,
} from './couponCanvas';

export interface CashCouponRenderData {
  couponCode: string;
  claimQrDataUrl: string;
}

const QR_X = 890;
const QR_Y = 96;
const QR_SIZE = 250;

const drawCenteredText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
): void => {
  ctx.fillText(text, x, y, maxWidth);
};

/**
 * Static cash-prize coupon artwork. The amount is intentionally not printed;
 * it is revealed by the WordPress claim page after the token is validated.
 */
export const createCashCouponTemplate = async (
  config: CashCouponConfig,
  linktreeQrDataUrl?: string
): Promise<HTMLCanvasElement> => {
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Canvas rendering can continue with fallback fonts.
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  const imagesToLoad: Array<Promise<HTMLImageElement>> = [
    loadImage(config.logoDataUrl),
    loadImage(WHATSAPP_ICON_DATA_URL),
    loadImage(LANDLINE_ICON_DATA_URL),
  ];
  if (config.includeLinktreeQr && linktreeQrDataUrl) {
    imagesToLoad.push(loadImage(linktreeQrDataUrl));
  }

  const loaded = await Promise.all(imagesToLoad);
  const logoImg = loaded[0];
  const waImg = loaded[1];
  const landlineImg = loaded[2];
  const linktreeImg = config.includeLinktreeQr ? loaded[3] : undefined;

  const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  bgGrad.addColorStop(0, '#FAF6EE');
  bgGrad.addColorStop(0.35, '#FDFBF7');
  bgGrad.addColorStop(0.7, '#F6EFE3');
  bgGrad.addColorStop(1, '#ECE2D0');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawRoundedRect(ctx, 14, 14, CANVAS_WIDTH - 28, CANVAS_HEIGHT - 28, 6, undefined, '#D97706', 2);
  drawRoundedRect(ctx, 22, 22, CANVAS_WIDTH - 44, CANVAS_HEIGHT - 44, 4, undefined, '#881337', 1.5);

  const drawCornerBracket = (x: number, y: number, angle: number): void => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, 18);
    ctx.stroke();
    ctx.restore();
  };
  drawCornerBracket(22, 22, 0);
  drawCornerBracket(CANVAS_WIDTH - 22, 22, Math.PI / 2);
  drawCornerBracket(CANVAS_WIDTH - 22, CANVAS_HEIGHT - 22, Math.PI);
  drawCornerBracket(22, CANVAS_HEIGHT - 22, -Math.PI / 2);

  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(325, 28);
  ctx.lineTo(325, CANVAS_HEIGHT - 28);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(720, 28);
  ctx.lineTo(720, CANVAS_HEIGHT - 28);
  ctx.stroke();
  ctx.restore();

  // Left zone: brand, contact, optional follow QR, or a cash seal.
  const leftX = 170;
  const maxLogoW = 300;
  const maxLogoH = 118;
  const logoRatio = Math.min(maxLogoW / (logoImg.width || maxLogoW), maxLogoH / (logoImg.height || maxLogoH), 1);
  const logoW = (logoImg.width || maxLogoW) * logoRatio;
  const logoH = (logoImg.height || maxLogoH) * logoRatio;
  ctx.drawImage(logoImg, leftX - logoW / 2, 34, logoW, logoH);

  const hasLandline = Boolean(config.landlineNumber && config.landlineNumber.trim());
  const phoneText = config.phoneNumber || '+977-9800000000';
  const phoneY = 188;
  const phoneFont = hasLandline ? 24 : 27;
  const waIconSize = Math.round(phoneFont * 1.1);
  ctx.font = `bold ${phoneFont}px Inter, system-ui, sans-serif`;
  const phoneWidth = Math.min(ctx.measureText(phoneText).width, 250);
  const phoneGroupW = waIconSize + 8 + phoneWidth;
  const phoneStartX = leftX - phoneGroupW / 2;
  ctx.drawImage(waImg, phoneStartX, phoneY - waIconSize * 0.85, waIconSize, waIconSize);
  ctx.fillStyle = '#881337';
  ctx.textAlign = 'left';
  drawCenteredText(ctx, phoneText, phoneStartX + waIconSize + 8, phoneY, 250);

  if (hasLandline) {
    const landlineText = config.landlineNumber?.trim() || '';
    const landlineFont = 22;
    const landlineIconSize = Math.round(landlineFont * 1.05);
    ctx.font = `bold ${landlineFont}px Inter, system-ui, sans-serif`;
    const landlineWidth = Math.min(ctx.measureText(landlineText).width, 240);
    const landlineGroupW = landlineIconSize + 8 + landlineWidth;
    const landlineStartX = leftX - landlineGroupW / 2;
    const landlineY = phoneY + phoneFont + 10;
    ctx.drawImage(
      landlineImg,
      landlineStartX,
      landlineY - landlineIconSize * 0.85,
      landlineIconSize,
      landlineIconSize
    );
    ctx.fillStyle = '#78350F';
    ctx.textAlign = 'left';
    drawCenteredText(ctx, landlineText, landlineStartX + landlineIconSize + 8, landlineY, 240);
  }

  if (config.includeLinktreeQr && linktreeImg) {
    const qrSize = 178;
    const qrX = leftX - qrSize / 2;
    const qrY = 266;
    drawRoundedRect(ctx, qrX, qrY, qrSize, qrSize, 6, '#FFFFFF', '#D97706', 2.5);
    const pad = 8;
    ctx.drawImage(linktreeImg, qrX + pad, qrY + pad, qrSize - pad * 2, qrSize - pad * 2);
    ctx.fillStyle = '#78350F';
    ctx.font = '800 17px Inter, system-ui, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.textAlign = 'center';
    ctx.fillText('FOLLOW US', leftX, qrY + qrSize + 27);
    ctx.letterSpacing = '0px';
  } else {
    const sealY = 380;
    const sealRadius = 92;
    ctx.save();
    ctx.beginPath();
    ctx.arc(leftX, sealY, sealRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#881337';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#D97706';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(leftX, sealY, sealRadius - 10, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#FDE68A';
    ctx.stroke();
    ctx.fillStyle = '#FDE68A';
    ctx.font = '900 13px Inter, system-ui, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.textAlign = 'center';
    ctx.fillText('GUARANTEED', leftX, sealY - 34);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 31px Cinzel, Georgia, serif';
    ctx.fillText('CASH', leftX, sealY + 2);
    ctx.fillText('PRIZE', leftX, sealY + 35);
    ctx.fillStyle = '#FDE68A';
    ctx.font = '800 12px Inter, system-ui, sans-serif';
    ctx.letterSpacing = '1.5px';
    ctx.fillText('SCAN TO REVEAL', leftX, sealY + 61);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // Centre zone: headline, hidden-prize instruction, code box, footer.
  const centerX = 522;
  ctx.fillStyle = '#881337';
  ctx.font = '900 48px Cinzel, "Playfair Display", Georgia, serif';
  ctx.letterSpacing = '2px';
  ctx.textAlign = 'center';
  drawCenteredText(ctx, 'CASH PRIZE', centerX, 100, 380);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#B45309';
  ctx.font = '900 23px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '8px';
  ctx.fillText('COUPON', centerX, 141);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#D97706';
  ctx.fillRect(centerX - 175, 156, 350, 4);
  ctx.save();
  ctx.translate(centerX, 158);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#B45309';
  ctx.fillRect(-7, -7, 14, 14);
  ctx.restore();

  ctx.fillStyle = '#1E293B';
  ctx.font = '800 15px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '0.6px';
  ctx.fillText('GUARANTEED CASH PRIZE — SCAN TO REVEAL', centerX, 190, 370);
  ctx.letterSpacing = '0px';

  const codeBoxW = 360;
  const codeBoxH = 135;
  const codeBoxX = centerX - codeBoxW / 2;
  const codeBoxY = 210;
  drawRoundedRect(ctx, codeBoxX, codeBoxY, codeBoxW, codeBoxH, 10, '#FFFFFF', '#881337', 2.5);
  drawRoundedRect(ctx, codeBoxX + 4, codeBoxY + 4, codeBoxW - 8, codeBoxH - 8, 6, undefined, '#D97706', 1);

  ctx.fillStyle = '#B45309';
  ctx.font = '800 17px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '3.5px';
  ctx.textAlign = 'center';
  ctx.fillText('COUPON CODE', centerX, codeBoxY + 34);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#991B1B';
  ctx.font = 'italic 700 21px Inter, system-ui, sans-serif';
  ctx.fillText('★ First claim wins ★', centerX, 390);

  ctx.fillStyle = '#78350F';
  ctx.font = '800 17px Inter, system-ui, sans-serif';
  ctx.fillText('Payment at end of day', centerX, 423);

  ctx.font = '700 15px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '1.2px';
  drawCenteredText(ctx, `BATCH: ${config.batchId}`, centerX, 458, 360);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#64748B';
  ctx.font = '600 13px Inter, system-ui, sans-serif';
  ctx.fillText('One claim per coupon • Keep this coupon', centerX, 492);
  ctx.font = '600 12px Inter, system-ui, sans-serif';
  ctx.fillText('Fresh Masala Cash Reward 2026', centerX, 520);

  // Right zone: claim QR and first-claim instruction.
  const badgeWidth = 230;
  const badgeHeight = 38;
  drawRoundedRect(
    ctx,
    QR_X - badgeWidth / 2,
    58,
    badgeWidth,
    badgeHeight,
    6,
    '#881337'
  );
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 15px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.textAlign = 'center';
  ctx.fillText('SCAN TO CLAIM', QR_X, 83);
  ctx.letterSpacing = '0px';

  drawRoundedRect(
    ctx,
    QR_X - QR_SIZE / 2,
    QR_Y,
    QR_SIZE,
    QR_SIZE,
    { tl: 0, tr: 0, br: 8, bl: 8 },
    '#FFFFFF',
    '#881337',
    2.5
  );

  const bannerW = 285;
  const bannerH = 48;
  drawRoundedRect(ctx, QR_X - bannerW / 2, 370, bannerW, bannerH, 8, '#D97706');
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 14px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('REVEAL CASH PRIZE', QR_X, 400);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#78350F';
  ctx.font = '800 17px Inter, system-ui, sans-serif';
  ctx.fillText('First claim wins', QR_X, 449);
  ctx.fillStyle = '#64748B';
  ctx.font = '600 14px Inter, system-ui, sans-serif';
  ctx.fillText('Payment at end of day', QR_X, 480);
  ctx.font = '600 12px Inter, system-ui, sans-serif';
  ctx.fillText('No app needed', QR_X, 508);

  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(2, 2, CANVAS_WIDTH - 4, CANVAS_HEIGHT - 4);
  ctx.restore();

  return canvas;
};

export const renderCashCouponToCanvas = async (
  templateCanvas: HTMLCanvasElement,
  coupon: CashCouponRenderData
): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(templateCanvas, 0, 0);

  const qrPad = 12;
  const qrImg = await loadImage(coupon.claimQrDataUrl);
  ctx.drawImage(
    qrImg,
    QR_X - QR_SIZE / 2 + qrPad,
    QR_Y + qrPad,
    QR_SIZE - qrPad * 2,
    QR_SIZE - qrPad * 2
  );

  ctx.fillStyle = '#4C0519';
  const maxCodeWidth = 330;
  const baseCodeFontSize = 54;
  ctx.font = `900 ${baseCodeFontSize}px "JetBrains Mono", "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  const measuredCodeWidth = ctx.measureText(coupon.couponCode).width;
  const codeFontSize =
    measuredCodeWidth > maxCodeWidth
      ? Math.max(18, Math.floor((baseCodeFontSize * maxCodeWidth) / measuredCodeWidth))
      : baseCodeFontSize;
  ctx.font = `900 ${codeFontSize}px "JetBrains Mono", "Courier New", monospace`;
  ctx.letterSpacing = codeFontSize < 30 ? '1px' : '4px';
  ctx.fillText(coupon.couponCode, 522, 318, maxCodeWidth);
  ctx.letterSpacing = '0px';

  return canvas;
};
