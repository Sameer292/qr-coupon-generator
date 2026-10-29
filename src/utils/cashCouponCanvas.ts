import type { CashCouponConfig } from '../types/coupon';
import {
  LANDLINE_ICON_DATA_URL,
  WHATSAPP_ICON_DATA_URL,
  drawRoundedRect,
  loadImage,
} from './couponCanvas';

export interface CashCouponRenderData {
  couponCode?: string;
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
const QR_BOX_W = 1260;
const QR_BOX_H = 740;
const QR_BOX_X = CX - QR_BOX_W / 2; // 256
const QR_BOX_Y = 940;
const QR_X = CX;
const QR_Y = 1050;
const QR_SIZE = 480;

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
 * Draws a traditional Tihar/Deepawali clay Diya with glowing flame.
 */
const drawDiya = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number = 1
): void => {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Outer ambient flame glow
  const glow = ctx.createRadialGradient(0, -32, 4, 0, -32, 54);
  glow.addColorStop(0, 'rgba(251, 191, 36, 0.7)');
  glow.addColorStop(0.4, 'rgba(245, 158, 11, 0.3)');
  glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -32, 54, 0, Math.PI * 2);
  ctx.fill();

  // Outer flame (vibrant saffron-orange)
  ctx.fillStyle = '#EA580C';
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.bezierCurveTo(18, -38, 22, -18, 0, -8);
  ctx.bezierCurveTo(-22, -18, -18, -38, 0, -58);
  ctx.fill();

  // Mid flame (golden amber)
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.moveTo(0, -52);
  ctx.bezierCurveTo(13, -36, 15, -20, 0, -11);
  ctx.bezierCurveTo(-15, -20, -13, -36, 0, -52);
  ctx.fill();

  // Inner flame (bright yellow)
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.bezierCurveTo(8, -28, 9, -18, 0, -13);
  ctx.bezierCurveTo(-9, -18, -8, -28, 0, -42);
  ctx.fill();

  // Pure white flame heart
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.bezierCurveTo(4, -24, 4, -18, 0, -15);
  ctx.bezierCurveTo(-4, -18, -4, -24, 0, -34);
  ctx.fill();

  // Terracotta clay bowl
  ctx.fillStyle = '#9A3412';
  ctx.beginPath();
  ctx.moveTo(-36, -8);
  ctx.bezierCurveTo(-38, 18, 38, 18, 36, -8);
  ctx.bezierCurveTo(20, -3, -20, -3, -36, -8);
  ctx.closePath();
  ctx.fill();

  // Golden Diya rim
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-36, -8);
  ctx.bezierCurveTo(-20, -3, 20, -3, 36, -8);
  ctx.stroke();

  // Pedestal base
  ctx.fillStyle = '#7C2D12';
  ctx.beginPath();
  ctx.moveTo(-16, 16);
  ctx.lineTo(16, 16);
  ctx.lineTo(12, 22);
  ctx.lineTo(-12, 22);
  ctx.closePath();
  ctx.fill();

  // Decorative beads on diya bowl
  ctx.fillStyle = '#FEF3C7';
  for (let i = -22; i <= 22; i += 11) {
    ctx.beginPath();
    ctx.arc(i, 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
};

/**
 * Draws a festive Marigold (सयपत्री फूल) flower motif.
 */
const drawMarigold = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
): void => {
  ctx.save();
  ctx.translate(cx, cy);

  // Outer orange petals
  ctx.fillStyle = '#EA580C';
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    ctx.beginPath();
    ctx.arc(
      Math.cos(angle) * (radius * 0.65),
      Math.sin(angle) * (radius * 0.65),
      radius * 0.42,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Mid golden petals
  ctx.fillStyle = '#F59E0B';
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 + 0.3;
    ctx.beginPath();
    ctx.arc(
      Math.cos(angle) * (radius * 0.45),
      Math.sin(angle) * (radius * 0.45),
      radius * 0.35,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Inner bright yellow petals
  ctx.fillStyle = '#FDE047';
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.arc(
      Math.cos(angle) * (radius * 0.25),
      Math.sin(angle) * (radius * 0.25),
      radius * 0.24,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Center core
  ctx.fillStyle = '#B45309';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

/**
 * Draws an ornate Rangoli corner ornament.
 */
const drawRangoliCorner = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number
): void => {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Rangoli corner rays
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(48, 0);
  ctx.lineTo(0, 0);
  ctx.lineTo(0, 48);
  ctx.stroke();

  // Lotus petal curve
  ctx.strokeStyle = '#881337';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 36, 0, Math.PI / 2);
  ctx.stroke();

  // Golden beads on arc
  ctx.fillStyle = '#F59E0B';
  for (let a = 0; a <= Math.PI / 2; a += Math.PI / 10) {
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 36, Math.sin(a) * 36, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Small corner marigold
  drawMarigold(ctx, 16, 16, 12);

  ctx.restore();
};

/**
 * Static Tihar-themed cash-prize coupon artwork for a 15cm x 20cm (portrait) voucher.
 * - Neither the cash amount nor the coupon code is printed on this physical voucher.
 * - Neither batch number nor sequence is printed.
 * - Features authentic Tihar festive symbols: glowing clay Diyas, Marigold (सयपत्री) flowers,
 *   royal burgundy and radiant gold auspicious palette, and the required exact tagline.
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

  // 1. Warm Festive Background (Rich Ivory & Gold Glow)
  const bgGrad = ctx.createRadialGradient(
    CX,
    900,
    100,
    CX,
    CASH_CANVAS_HEIGHT / 2,
    CASH_CANVAS_HEIGHT * 0.75
  );
  bgGrad.addColorStop(0, '#FFFDF8');
  bgGrad.addColorStop(0.35, '#FEF9EC');
  bgGrad.addColorStop(0.7, '#FDF3DA');
  bgGrad.addColorStop(1, '#F8E9C4');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CASH_CANVAS_WIDTH, CASH_CANVAS_HEIGHT);

  // Subtle festive micro-sparkles across background
  ctx.fillStyle = 'rgba(217, 119, 6, 0.15)';
  const sparklePositions = [
    [180, 160], [1590, 160], [220, 520], [1550, 520],
    [160, 1100], [1610, 1100], [200, 1750], [1570, 1750],
    [320, 2220], [1450, 2220],
  ];
  for (const [sx, sy] of sparklePositions) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, 0);
    ctx.moveTo(0, -14);
    ctx.lineTo(0, 14);
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // 2. Festive Royal Borders with Gold Accents
  // Outer gold rim
  drawRoundedRect(ctx, 36, 36, CASH_CANVAS_WIDTH - 72, CASH_CANVAS_HEIGHT - 72, 20, undefined, '#D97706', 4.5);
  // Inner royal festive burgundy border
  drawRoundedRect(ctx, 50, 50, CASH_CANVAS_WIDTH - 100, CASH_CANVAS_HEIGHT - 100, 14, undefined, '#881337', 3);
  // Gold bead line border
  drawRoundedRect(ctx, 64, 64, CASH_CANVAS_WIDTH - 128, CASH_CANVAS_HEIGHT - 128, 10, undefined, 'rgba(217, 119, 6, 0.4)', 1.5);

  // Ornate Rangoli corners
  drawRangoliCorner(ctx, 50, 50, 0);
  drawRangoliCorner(ctx, CASH_CANVAS_WIDTH - 50, 50, Math.PI / 2);
  drawRangoliCorner(ctx, CASH_CANVAS_WIDTH - 50, CASH_CANVAS_HEIGHT - 50, Math.PI);
  drawRangoliCorner(ctx, 50, CASH_CANVAS_HEIGHT - 50, -Math.PI / 2);

  // 3. Top Header: Brand Logo & Support Contacts
  const maxLogoW = 560;
  const maxLogoH = 175;
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
  const contactY = 315;

  // WhatsApp
  ctx.drawImage(waImg, contactStartX, contactY - waIconSize * 0.85, waIconSize, waIconSize);
  contactStartX += waIconSize + 10;
  ctx.fillStyle = '#881337';
  ctx.font = `bold ${phoneFont}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(phoneText, contactStartX, contactY);
  contactStartX += phoneW;

  // Landline
  if (hasLandline) {
    contactStartX += 40;
    ctx.drawImage(landlineImg, contactStartX, contactY - landlineIconSize * 0.85, landlineIconSize, landlineIconSize);
    contactStartX += landlineIconSize + 10;
    ctx.fillStyle = '#78350F';
    ctx.font = `bold ${landlineFont}px Inter, system-ui, sans-serif`;
    ctx.fillText(landlineText, contactStartX, contactY);
  }

  // Decorative Toran garland line with Sayapatri flowers
  ctx.save();
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX - 550, 360);
  ctx.lineTo(CX + 550, 360);
  ctx.stroke();

  // Little marigolds along the line
  drawMarigold(ctx, CX - 550, 360, 14);
  drawMarigold(ctx, CX - 275, 360, 11);
  drawMarigold(ctx, CX, 360, 16);
  drawMarigold(ctx, CX + 275, 360, 11);
  drawMarigold(ctx, CX + 550, 360, 14);
  ctx.restore();

  // 4. Tihar Greeting Header & Twin Diyas
  // Left and Right Illuminated Diyas flanking the greeting badge
  drawDiya(ctx, CX - 340, 420, 1.15);
  drawDiya(ctx, CX + 340, 420, 1.15);

  // Festive Tihar Pill Badge in Center
  const tiharBadgeW = 540;
  const tiharBadgeH = 46;
  drawRoundedRect(ctx, CX - tiharBadgeW / 2, 400, tiharBadgeW, tiharBadgeH, 23, '#881337', '#D97706', 2);
  ctx.fillStyle = '#FEF08A';
  ctx.font = '800 20px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.textAlign = 'center';
  ctx.fillText('★ शुभ दीपावली तथा तिहार उत्सव ★', CX, 431);
  ctx.letterSpacing = '0px';

  // Grand Title
  ctx.fillStyle = '#881337';
  ctx.font = '900 88px Cinzel, "Playfair Display", Georgia, serif';
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

  // Horizontal divider with gold diamond
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
  const ribbonW = 1480;
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
  ctx.fillText(
    'कुपनको नगद रकम क्यामेराले स्क्यान गरेपछि मात्र देखिनेछ • Scan to reveal cash prize',
    CX,
    ribbonY + 145
  );

  // 6. Hero Center: QR Code Container Card (Tihar Diya Flanked)
  // Flanking grand Diyas on left and right of the QR box
  drawDiya(ctx, QR_BOX_X - 60, QR_BOX_Y + QR_BOX_H / 2 + 10, 1.45);
  drawDiya(ctx, QR_BOX_X + QR_BOX_W + 60, QR_BOX_Y + QR_BOX_H / 2 + 10, 1.45);

  drawRoundedRect(ctx, QR_BOX_X, QR_BOX_Y, QR_BOX_W, QR_BOX_H, 24, '#FFFFFF', '#881337', 3);
  drawRoundedRect(ctx, QR_BOX_X + 6, QR_BOX_Y + 6, QR_BOX_W - 12, QR_BOX_H - 12, 18, undefined, '#D97706', 1.5);

  // QR Header ribbon
  const qrHeaderH = 70;
  drawRoundedRect(
    ctx,
    QR_BOX_X,
    QR_BOX_Y,
    QR_BOX_W,
    qrHeaderH,
    { tl: 24, tr: 24, br: 0, bl: 0 },
    '#881337'
  );
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 26px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.textAlign = 'center';
  ctx.fillText('SCAN WITH PHONE TO REVEAL & CLAIM CASH', CX, QR_BOX_Y + 45);
  ctx.letterSpacing = '0px';

  // QR placeholder outline in template
  drawRoundedRect(ctx, QR_X - QR_SIZE / 2, QR_Y, QR_SIZE, QR_SIZE, 14, '#FFFFFF', 'rgba(180, 83, 9, 0.35)', 2);

  // Call-To-Action Button below QR
  const ctaW = 900;
  const ctaH = 68;
  const ctaY = 1530;
  drawRoundedRect(ctx, CX - ctaW / 2, ctaY, ctaW, ctaH, 34, '#D97706', '#B45309', 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 26px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('POINT CAMERA AT QR CODE TO CLAIM', CX, ctaY + 44);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#64748B';
  ctx.font = '600 22px Inter, system-ui, sans-serif';
  ctx.fillText('Works with any smartphone camera • कुनै पनि एप डाउनलोड गर्नुपर्दैन', CX, ctaY + 100);

  // 7. Festive Rules & Payout Terms Block (NO COUPON CODE & NO BATCH NUMBER)
  ctx.fillStyle = '#991B1B';
  ctx.font = 'italic 900 32px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★ First Complete Claim Submission Wins ★', CX, 1780);

  // Terms Cards
  const termsBoxW = 1260;
  const termsBoxH = 260;
  const termsBoxY = 1820;
  drawRoundedRect(
    ctx,
    CX - termsBoxW / 2,
    termsBoxY,
    termsBoxW,
    termsBoxH,
    20,
    'rgba(254, 243, 199, 0.45)',
    '#D97706',
    2
  );

  ctx.fillStyle = '#334155';
  ctx.font = '700 23px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  const textLeft = CX - termsBoxW / 2 + 50;

  ctx.fillText('१. QR कोड स्क्यान गरी आफ्नो फोनमा खोलिएको दाबी फारम भर्नुहोस्।', textLeft, termsBoxY + 55);
  ctx.fillText('२. स्क्यान गरेपछि मात्र कुपनको नगद पुरस्कार रकम खुल्नेछ (Amount revealed after scan)।', textLeft, termsBoxY + 105);
  ctx.fillText('३. प्रमाणित भएको पुरस्कार रकम दिनको अन्त्यमा सिधै भुक्तानी गरिनेछ (End-of-day payout)।', textLeft, termsBoxY + 155);
  ctx.fillText('४. भुक्तानी प्राप्त नभएसम्म यो भौतिक कुपन सुरक्षित राख्नुहोला (Keep voucher until paid)।', textLeft, termsBoxY + 205);

  // Optional Linktree Follow QR at the bottom or Festive Trust Seal
  if (config.includeLinktreeQr && linktreeImg) {
    const followQrSize = 130;
    const followX = CX - 350;
    const followY = 2120;
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
    // Elegant Trust Seal & Festive Diya in center
    ctx.save();
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX - 450, 2140);
    ctx.lineTo(CX + 450, 2140);
    ctx.stroke();
    ctx.restore();

    drawDiya(ctx, CX, 2170, 0.95);

    ctx.fillStyle = '#78350F';
    ctx.font = '800 20px Inter, system-ui, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.textAlign = 'center';
    ctx.fillText('AUTHENTIC FRESH MASALA FESTIVE CASH CAMPAIGN', CX, 2225);
    ctx.letterSpacing = '0px';
  }

  // 8. Footer Note (NO BATCH NUMBER & NO COUPON CODE)
  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 18px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Fresh Masala Festive Campaign • Terms & Conditions apply • Valid during campaign period',
    CX,
    2280
  );

  // Subtle cut guide around the edges
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(12, 12, CASH_CANVAS_WIDTH - 24, CASH_CANVAS_HEIGHT - 24);
  ctx.restore();

  return canvas;
};

/**
 * Renders the final per-voucher canvas.
 * Only stamps the unique QR code on the canvas.
 * Neither coupon code nor batch number is printed.
 */
export const renderCashCouponToCanvas = async (
  templateCanvas: HTMLCanvasElement,
  coupon: CashCouponRenderData
): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  canvas.width = CASH_CANVAS_WIDTH;
  canvas.height = CASH_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Draw the static Tihar-themed background
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

  return canvas;
};
