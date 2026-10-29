import type { CashCouponConfig } from '../types/coupon';
import {
  LANDLINE_ICON_DATA_URL,
  WHATSAPP_ICON_DATA_URL,
  drawRoundedRect,
  loadImage,
} from './couponCanvas';

export interface CashCouponRenderData {
  couponCode: string;
  claimQrDataUrl: string;
}

// 15cm wide × 20cm tall at 300 DPI
export const CASH_CARD_WIDTH_MM = 150;
export const CASH_CARD_HEIGHT_MM = 200;
export const CASH_CANVAS_WIDTH = 1772;
export const CASH_CANVAS_HEIGHT = 2362;

// Center X for all symmetrical elements
const CX = CASH_CANVAS_WIDTH / 2; // 886

// QR Code placement on the 15cm x 20cm canvas
const QR_BOX_X = CX - 630; // 256
const QR_BOX_Y = 890;
const QR_BOX_W = 1260;
const QR_BOX_H = 690;
const QR_X = CX;
const QR_Y = 990;
const QR_SIZE = 450;

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
 * Static cash-prize coupon artwork for a 15cm x 20cm (portrait) voucher.
 * The prize amount is intentionally NOT printed on the card; it is revealed
 * on the website after the QR code is scanned.
 * The batch number is NOT printed anywhere on this coupon.
 */
export const createCashCouponTemplate = async (
  config: CashCouponConfig,
  linktreeQrDataUrl?: string
): Promise<HTMLCanvasElement> => {
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue with fallback fonts if needed
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = CASH_CANVAS_WIDTH;
  canvas.height = CASH_CANVAS_HEIGHT;
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

  // 1. Festive Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, CASH_CANVAS_WIDTH, CASH_CANVAS_HEIGHT);
  bgGrad.addColorStop(0, '#FAF6EE');
  bgGrad.addColorStop(0.3, '#FDFBF7');
  bgGrad.addColorStop(0.7, '#F7EFE1');
  bgGrad.addColorStop(1, '#ECE0CA');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CASH_CANVAS_WIDTH, CASH_CANVAS_HEIGHT);

  // 2. Ornate Festive Borders
  // Outer gold border
  drawRoundedRect(ctx, 36, 36, CASH_CANVAS_WIDTH - 72, CASH_CANVAS_HEIGHT - 72, 16, undefined, '#D97706', 4);
  // Inner royal burgundy border
  drawRoundedRect(ctx, 52, 52, CASH_CANVAS_WIDTH - 104, CASH_CANVAS_HEIGHT - 104, 10, undefined, '#881337', 2.5);
  // Delicate accent border
  drawRoundedRect(ctx, 64, 64, CASH_CANVAS_WIDTH - 128, CASH_CANVAS_HEIGHT - 128, 6, undefined, 'rgba(217, 119, 6, 0.35)', 1.5);

  // Corner decorative brackets
  const drawCornerBracket = (x: number, y: number, angle: number): void => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(36, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, 36);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#D97706';
    ctx.beginPath();
    ctx.moveTo(28, 8);
    ctx.lineTo(8, 8);
    ctx.lineTo(8, 28);
    ctx.stroke();
    ctx.restore();
  };

  drawCornerBracket(52, 52, 0);
  drawCornerBracket(CASH_CANVAS_WIDTH - 52, 52, Math.PI / 2);
  drawCornerBracket(CASH_CANVAS_WIDTH - 52, CASH_CANVAS_HEIGHT - 52, Math.PI);
  drawCornerBracket(52, CASH_CANVAS_HEIGHT - 52, -Math.PI / 2);

  // 3. Top Brand Section
  const maxLogoW = 580;
  const maxLogoH = 180;
  const logoRatio = Math.min(
    maxLogoW / (logoImg.width || maxLogoW),
    maxLogoH / (logoImg.height || maxLogoH),
    1
  );
  const logoW = (logoImg.width || maxLogoW) * logoRatio;
  const logoH = (logoImg.height || maxLogoH) * logoRatio;
  ctx.drawImage(logoImg, CX - logoW / 2, 95, logoW, logoH);

  // Contact Info Line
  const hasLandline = Boolean(config.landlineNumber && config.landlineNumber.trim());
  const phoneText = config.phoneNumber || '+977-9800000000';
  const phoneFont = 30;
  const waIconSize = Math.round(phoneFont * 1.15);
  ctx.font = `bold ${phoneFont}px Inter, system-ui, sans-serif`;
  const phoneW = ctx.measureText(phoneText).width;

  let totalContactW = waIconSize + 10 + phoneW;
  let landlineText = '';
  let landlineW = 0;
  const landlineFont = 28;
  const landlineIconSize = Math.round(landlineFont * 1.1);

  if (hasLandline) {
    landlineText = config.landlineNumber?.trim() || '';
    ctx.font = `bold ${landlineFont}px Inter, system-ui, sans-serif`;
    landlineW = ctx.measureText(landlineText).width;
    totalContactW += 40 + landlineIconSize + 10 + landlineW;
  }

  let contactStartX = CX - totalContactW / 2;
  const contactY = 320;

  // Draw WhatsApp
  ctx.drawImage(waImg, contactStartX, contactY - waIconSize * 0.85, waIconSize, waIconSize);
  contactStartX += waIconSize + 10;
  ctx.fillStyle = '#881337';
  ctx.font = `bold ${phoneFont}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(phoneText, contactStartX, contactY);
  contactStartX += phoneW;

  // Draw Landline if present
  if (hasLandline) {
    contactStartX += 40;
    ctx.drawImage(landlineImg, contactStartX, contactY - landlineIconSize * 0.85, landlineIconSize, landlineIconSize);
    contactStartX += landlineIconSize + 10;
    ctx.fillStyle = '#78350F';
    ctx.font = `bold ${landlineFont}px Inter, system-ui, sans-serif`;
    ctx.fillText(landlineText, contactStartX, contactY);
  }

  // Divider below contacts
  ctx.save();
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX - 400, 360);
  ctx.lineTo(CX + 400, 360);
  ctx.stroke();

  // Central ornamental diamond
  ctx.fillStyle = '#D97706';
  ctx.translate(CX, 360);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-7, -7, 14, 14);
  ctx.restore();

  // 4. Grand Headline
  // Top decorative badge
  const badgeW = 480;
  const badgeH = 44;
  drawRoundedRect(ctx, CX - badgeW / 2, 400, badgeW, badgeH, 22, '#881337');
  ctx.fillStyle = '#FDE68A';
  ctx.font = '800 20px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.textAlign = 'center';
  ctx.fillText('★ FESTIVE CASH REWARD ★', CX, 430);
  ctx.letterSpacing = '0px';

  // Main Title
  ctx.fillStyle = '#881337';
  ctx.font = '900 86px Cinzel, "Playfair Display", Georgia, serif';
  ctx.letterSpacing = '4px';
  ctx.textAlign = 'center';
  drawCenteredText(ctx, 'CASH PRIZE', CX, 535, 1200);
  ctx.letterSpacing = '0px';

  // Subtitle
  ctx.fillStyle = '#B45309';
  ctx.font = '900 42px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '14px';
  ctx.fillText('VOUCHER', CX, 595);
  ctx.letterSpacing = '0px';

  // Horizontal ornamental divider
  ctx.save();
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CX - 500, 625);
  ctx.lineTo(CX + 500, 625);
  ctx.stroke();

  ctx.fillStyle = '#B45309';
  ctx.translate(CX, 625);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-8, -8, 16, 16);
  ctx.restore();

  // 5. Core Guaranteed Cash Prize Tagline Banner (EXACT STRING REQUIRED)
  const ribbonW = 1460;
  const ribbonH = 104;
  const ribbonY = 665;
  drawRoundedRect(ctx, CX - ribbonW / 2, ribbonY, ribbonW, ribbonH, 16, '#B45309', '#78350F', 3);
  drawRoundedRect(ctx, CX - ribbonW / 2 + 4, ribbonY + 4, ribbonW - 8, ribbonH - 8, 12, '#D97706');

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 38px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.textAlign = 'center';
  ctx.fillText('GUARANTEED CASH PRIZE — SCAN TO REVEAL', CX, ribbonY + 66, ribbonW - 40);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#475569';
  ctx.font = 'italic 600 24px Inter, system-ui, sans-serif';
  ctx.fillText('Cash amount is revealed instantly on your phone upon scanning', CX, ribbonY + 145);

  // 6. Hero Center: QR Code Container Card
  drawRoundedRect(ctx, QR_BOX_X, QR_BOX_Y, QR_BOX_W, QR_BOX_H, 24, '#FFFFFF', '#881337', 3);
  drawRoundedRect(ctx, QR_BOX_X + 6, QR_BOX_Y + 6, QR_BOX_W - 12, QR_BOX_H - 12, 18, undefined, '#D97706', 1.5);

  // QR Header ribbon
  const qrHeaderH = 68;
  drawRoundedRect(ctx, QR_BOX_X, QR_BOX_Y, QR_BOX_W, qrHeaderH, { tl: 24, tr: 24, br: 0, bl: 0 }, '#881337');
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 26px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.textAlign = 'center';
  ctx.fillText('SCAN TO REVEAL & CLAIM YOUR CASH PRIZE', CX, QR_BOX_Y + 44);
  ctx.letterSpacing = '0px';

  // QR placeholder outline in template
  drawRoundedRect(ctx, QR_X - QR_SIZE / 2, QR_Y, QR_SIZE, QR_SIZE, 12, '#FFFFFF', 'rgba(180, 83, 9, 0.4)', 2);

  // Call-To-Action Button below QR
  const ctaW = 860;
  const ctaH = 64;
  const ctaY = 1485;
  drawRoundedRect(ctx, CX - ctaW / 2, ctaY, ctaW, ctaH, 32, '#D97706', '#B45309', 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 25px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('POINT CAMERA AT QR CODE TO CLAIM', CX, ctaY + 42);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#64748B';
  ctx.font = '600 21px Inter, system-ui, sans-serif';
  ctx.fillText('Works with any smartphone camera • No app required', CX, ctaY + 88);

  // 7. Human-Readable Coupon Code Box
  const codeBoxW = 1260;
  const codeBoxH = 205;
  const codeBoxY = 1625;
  drawRoundedRect(ctx, CX - codeBoxW / 2, codeBoxY, codeBoxW, codeBoxH, 20, '#FFFFFF', '#881337', 3);
  drawRoundedRect(ctx, CX - codeBoxW / 2 + 5, codeBoxY + 5, codeBoxW - 10, codeBoxH - 10, 15, undefined, '#D97706', 1.5);

  ctx.fillStyle = '#B45309';
  ctx.font = '800 23px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.textAlign = 'center';
  ctx.fillText('COUPON CODE', CX, codeBoxY + 42);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#78350F';
  ctx.font = '600 20px Inter, system-ui, sans-serif';
  ctx.fillText('(Keep this voucher and code for payout confirmation)', CX, codeBoxY + 178);

  // 8. Rules & Payout Information Block (NO BATCH NUMBER)
  ctx.fillStyle = '#991B1B';
  ctx.font = 'italic 900 30px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★ First Complete Claim Submission Wins ★', CX, 1885);

  ctx.fillStyle = '#334155';
  ctx.font = '700 23px Inter, system-ui, sans-serif';
  ctx.fillText('• Scan the QR code with your smartphone and submit claimant details', CX, 1935);
  ctx.fillText('• Payouts processed at end of day via digital wallet, bank, or cash', CX, 1975);
  ctx.fillText('• Each QR token is single-use and protected by encryption', CX, 2015);

  ctx.fillStyle = '#64748B';
  ctx.font = '600 20px Inter, system-ui, sans-serif';
  ctx.fillText('Hold onto this physical voucher until payout is completed • One claim per coupon', CX, 2065);

  // Optional Linktree Follow QR at the bottom or Festive Trust Seal
  if (config.includeLinktreeQr && linktreeImg) {
    const followQrSize = 130;
    const followX = CX - 350;
    const followY = 2110;
    drawRoundedRect(ctx, followX, followY, followQrSize, followQrSize, 8, '#FFFFFF', '#D97706', 2);
    ctx.drawImage(linktreeImg, followX + 6, followY + 6, followQrSize - 12, followQrSize - 12);

    ctx.fillStyle = '#78350F';
    ctx.font = '800 18px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FOLLOW US FOR ANNOUNCEMENTS', followX + followQrSize + 20, followY + 45);
    ctx.fillStyle = '#64748B';
    ctx.font = '600 16px Inter, system-ui, sans-serif';
    ctx.fillText('Scan to view social links & official updates', followX + followQrSize + 20, followY + 80);
  } else {
    // Elegant Trust Seal in center
    ctx.save();
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX - 450, 2150);
    ctx.lineTo(CX + 450, 2150);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#78350F';
    ctx.font = '800 20px Inter, system-ui, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.textAlign = 'center';
    ctx.fillText('AUTHENTIC FRESH MASALA PROMOTIONAL CAMPAIGN', CX, 2185);
    ctx.letterSpacing = '0px';
  }

  // 9. Footer Note (NO BATCH NUMBER)
  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 18px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Fresh Masala Festive Campaign • Terms & Conditions apply • Valid during campaign period', CX, 2260);

  // Subtle cut guide around the edges
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(12, 12, CASH_CANVAS_WIDTH - 24, CASH_CANVAS_HEIGHT - 24);
  ctx.restore();

  return canvas;
};

export const renderCashCouponToCanvas = async (
  templateCanvas: HTMLCanvasElement,
  coupon: CashCouponRenderData
): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  canvas.width = CASH_CANVAS_WIDTH;
  canvas.height = CASH_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(templateCanvas, 0, 0);

  // Stamp QR Code
  const qrPad = 16;
  const qrImg = await loadImage(coupon.claimQrDataUrl);
  ctx.drawImage(
    qrImg,
    QR_X - QR_SIZE / 2 + qrPad,
    QR_Y + qrPad,
    QR_SIZE - qrPad * 2,
    QR_SIZE - qrPad * 2
  );

  // Stamp Coupon Code in the code box
  ctx.fillStyle = '#4C0519';
  const maxCodeWidth = 1000;
  const baseCodeFontSize = 84;
  ctx.font = `900 ${baseCodeFontSize}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '5px';
  const measuredCodeWidth = ctx.measureText(coupon.couponCode).width;
  const codeFontSize =
    measuredCodeWidth > maxCodeWidth
      ? Math.max(30, Math.floor((baseCodeFontSize * maxCodeWidth) / measuredCodeWidth))
      : baseCodeFontSize;
  ctx.font = `900 ${codeFontSize}px "JetBrains Mono", monospace`;
  ctx.letterSpacing = codeFontSize < 40 ? '2px' : '5px';
  ctx.fillText(coupon.couponCode, CX, 1745, maxCodeWidth);
  ctx.letterSpacing = '0px';

  return canvas;
};
