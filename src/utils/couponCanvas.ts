import type { CouponConfig, CouponLayoutConfig } from '../types/coupon';
import { DEFAULT_LAYOUT_CONFIG } from '../types/coupon';

// High-DPI canvas dimensions for 90mm x 50mm card (300 DPI: 1063 x 591 px)
export const CANVAS_WIDTH = 1063;
export const CANVAS_HEIGHT = 591;

export interface CouponRenderData {
  couponCode: string;
  verificationQrDataUrl: string;
}

// Crisp official WhatsApp Icon SVG Data URL
const WHATSAPP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="#25D366">
  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.25-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.98-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.06s.88 2.39 1 2.56c.12.17 1.73 2.65 4.2 3.71.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.12-.23-.19-.48-.31z"/>
</svg>`;

const WHATSAPP_ICON_DATA_URL = `data:image/svg+xml;base64,${typeof btoa !== 'undefined' ? btoa(WHATSAPP_ICON_SVG) : Buffer.from(WHATSAPP_ICON_SVG).toString('base64')}`;

// Crisp Landline / Office Phone Icon SVG Data URL
const LANDLINE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="#881337">
  <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1 1 0 0 0-1.02.24l-2.2 2.2a15.04 15.04 0 0 1-6.59-6.59l2.2-2.21a1 1 0 0 0 .25-1.01A11.36 11.36 0 0 1 8.5 4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1 17 17 0 0 0 17 17 1 1 0 0 0 1-1v-3.5a1 1 0 0 0-1-1zM19 12h2a9 9 0 0 0-9-9v2a7 7 0 0 1 7 7zm-4 0h2a5 5 0 0 0-5-5v2a3 3 0 0 1 3 3z"/>
</svg>`;

const LANDLINE_ICON_DATA_URL = `data:image/svg+xml;base64,${typeof btoa !== 'undefined' ? btoa(LANDLINE_ICON_SVG) : Buffer.from(LANDLINE_ICON_SVG).toString('base64')}`;

/**
 * Pre-loads an image Data URL into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));
    img.src = src;
  });
}

/**
 * Helper to draw rounded rectangle with optional fill and stroke
 */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | { tl: number; tr: number; br: number; bl: number },
  fill?: string,
  stroke?: string,
  lineWidth: number = 1
) {
  let rTopLeft = 0;
  let rTopRight = 0;
  let rBottomRight = 0;
  let rBottomLeft = 0;

  if (typeof radius === 'number') {
    rTopLeft = radius;
    rTopRight = radius;
    rBottomRight = radius;
    rBottomLeft = radius;
  } else {
    rTopLeft = radius.tl;
    rTopRight = radius.tr;
    rBottomRight = radius.br;
    rBottomLeft = radius.bl;
  }

  ctx.beginPath();
  ctx.moveTo(x + rTopLeft, y);
  ctx.lineTo(x + width - rTopRight, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + rTopRight);
  ctx.lineTo(x + width, y + height - rBottomRight);
  ctx.quadraticCurveTo(x + width, y + height, x + width - rBottomRight, y + height);
  ctx.lineTo(x + rBottomLeft, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - rBottomLeft);
  ctx.lineTo(x, y + rTopLeft);
  ctx.quadraticCurveTo(x, y, x + rTopLeft, y);
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/**
 * Creates the static template canvas containing all invariant elements with a luxury light beige festive aesthetic.
 * Reads positions, dimensions, and font sizes from config.layout (or default layout).
 */
export async function createStaticCouponTemplate(
  config: CouponConfig,
  linktreeQrDataUrl: string
): Promise<HTMLCanvasElement> {
  const layout: CouponLayoutConfig = config.layout || DEFAULT_LAYOUT_CONFIG;

  // Ensure custom web fonts are loaded prior to rasterizing canvas
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue if font loading promise fails
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  // Load logo, WhatsApp icon, Landline icon & Linktree QR
  const [logoImg, linktreeQrImg, waImg, landlineImg] = await Promise.all([
    loadImage(config.logoDataUrl),
    loadImage(linktreeQrDataUrl),
    loadImage(WHATSAPP_ICON_DATA_URL),
    loadImage(LANDLINE_ICON_DATA_URL),
  ]);

  // 1. Background - Elegant Warm Light Beige Parchment
  const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  bgGrad.addColorStop(0, '#FAF6EE');
  bgGrad.addColorStop(0.35, '#FDFBF7');
  bgGrad.addColorStop(0.7, '#F6EFE3');
  bgGrad.addColorStop(1, '#ECE2D0');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Outer ornate gold border frame (inset 14px)
  drawRoundedRect(ctx, 14, 14, CANVAS_WIDTH - 28, CANVAS_HEIGHT - 28, 6, undefined, '#D97706', 2);

  // Inner deep crimson festive border (inset 22px)
  drawRoundedRect(ctx, 22, 22, CANVAS_WIDTH - 44, CANVAS_HEIGHT - 44, 4, undefined, '#881337', 1.5);

  // Decorative corner brackets
  const drawCornerBracket = (x: number, y: number, angle: number) => {
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

  // 2. Zone Dividers (Subtle warm gold dashed lines)
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)';
  ctx.lineWidth = 1.5;

  // Left zone divider (~31% of width = 325px)
  ctx.beginPath();
  ctx.moveTo(325, 28);
  ctx.lineTo(325, CANVAS_HEIGHT - 28);
  ctx.stroke();

  // Right zone divider (~68% of width = 720px)
  ctx.beginPath();
  ctx.moveTo(720, 28);
  ctx.lineTo(720, CANVAS_HEIGHT - 28);
  ctx.stroke();
  ctx.restore();

  // ----------------------------------------------------
  // 3. LEFT ZONE
  // ----------------------------------------------------
  const leftX = layout.logo.x;

  // A. Brand Logo
  const maxLogoW = layout.logo.width;
  const maxLogoH = layout.logo.height;
  let logoW = logoImg.width || maxLogoW;
  let logoH = logoImg.height || maxLogoH;
  const logoRatio = Math.min(maxLogoW / logoW, maxLogoH / logoH, 1);
  logoW = logoW * logoRatio;
  logoH = logoH * logoRatio;
  ctx.drawImage(logoImg, leftX - logoW / 2, layout.logo.y, logoW, logoH);

  // B. Contact Numbers: WhatsApp Mobile & Office Landline
  const hasLandline = Boolean(config.landlineNumber && config.landlineNumber.trim());
  const phoneX = layout.phone.x;
  const phoneY = layout.phone.y;

  if (hasLandline) {
    // 1. WhatsApp Mobile Row
    const phoneText = config.phoneNumber || '+977-9800000000';
    ctx.font = `bold ${layout.phone.waFontSize}px Inter, system-ui, sans-serif`;
    const textWidth = ctx.measureText(phoneText).width;
    const waIconSize = Math.round(layout.phone.waFontSize * 1.15);
    const gap = 8;
    const totalGroupW = waIconSize + gap + textWidth;
    const startX1 = phoneX - totalGroupW / 2;
    const phoneY1 = phoneY;

    ctx.drawImage(waImg, startX1, phoneY1 - waIconSize * 0.85, waIconSize, waIconSize);
    ctx.fillStyle = '#881337';
    ctx.textAlign = 'left';
    ctx.fillText(phoneText, startX1 + waIconSize + gap, phoneY1);

    // 2. Office Landline Row
    const landlineText = config.landlineNumber!.trim();
    ctx.font = `bold ${layout.phone.landlineFontSize}px Inter, system-ui, sans-serif`;
    const landlineWidth = ctx.measureText(landlineText).width;
    const landlineIconSize = Math.round(layout.phone.landlineFontSize * 1.1);
    const totalGroupW2 = landlineIconSize + gap + landlineWidth;
    const startX2 = phoneX - totalGroupW2 / 2;
    const phoneY2 = phoneY + layout.phone.waFontSize + 12;

    ctx.drawImage(landlineImg, startX2, phoneY2 - landlineIconSize * 0.85, landlineIconSize, landlineIconSize);
    ctx.fillStyle = '#78350F';
    ctx.textAlign = 'left';
    ctx.fillText(landlineText, startX2 + landlineIconSize + gap, phoneY2);
  } else {
    // Single WhatsApp Mobile Row (centered)
    const phoneText = config.phoneNumber || '+977-9800000000';
    ctx.font = `bold ${layout.phone.waFontSize + 3}px Inter, system-ui, sans-serif`;
    const textWidth = ctx.measureText(phoneText).width;
    const waIconSize = Math.round((layout.phone.waFontSize + 3) * 1.15);
    const gap = 8;
    const totalGroupW = waIconSize + gap + textWidth;
    const startX = phoneX - totalGroupW / 2;

    ctx.drawImage(waImg, startX, phoneY - waIconSize * 0.85, waIconSize, waIconSize);
    ctx.fillStyle = '#881337';
    ctx.textAlign = 'left';
    ctx.fillText(phoneText, startX + waIconSize + gap, phoneY);
  }

  // C. Linktree QR (Pure White Card with amber border)
  const qr1Size = layout.linktreeQr.size;
  const qr1X = layout.linktreeQr.x - qr1Size / 2;
  const qr1Y = layout.linktreeQr.y;

  drawRoundedRect(ctx, qr1X, qr1Y, qr1Size, qr1Size, 6, '#FFFFFF', '#D97706', 2.5);

  // Draw Linktree QR code inside with quiet zone
  const qrInnerPad = Math.max(6, Math.round(qr1Size * 0.04));
  ctx.drawImage(
    linktreeQrImg,
    qr1X + qrInnerPad,
    qr1Y + qrInnerPad,
    qr1Size - qrInnerPad * 2,
    qr1Size - qrInnerPad * 2
  );

  // D. Caption "FOLLOW US" directly beneath
  ctx.fillStyle = '#78350F';
  ctx.font = `800 ${layout.linktreeQr.captionFontSize}px Inter, system-ui, sans-serif`;
  ctx.letterSpacing = '3px';
  ctx.textAlign = 'center';
  ctx.fillText('FOLLOW US', layout.linktreeQr.x, qr1Y + qr1Size + layout.linktreeQr.captionFontSize + 10);
  ctx.letterSpacing = '0px';

  // ----------------------------------------------------
  // 4. CENTRE ZONE
  // ----------------------------------------------------
  const centerZoneX = layout.header.x;

  // A. Heading: "FESTIVAL PACKAGE"
  ctx.fillStyle = '#881337';
  ctx.font = `900 ${layout.header.titleFontSize}px Cinzel, "Playfair Display", Georgia, serif`;
  ctx.letterSpacing = '2px';
  ctx.textAlign = 'center';
  ctx.fillText('FESTIVAL PACKAGE', centerZoneX, layout.header.y);

  // B. FULL-WIDTH DECORATIVE UNDERLINE
  const underlineW = layout.header.underlineWidth;
  const underlineY = layout.header.y + Math.round(layout.header.titleFontSize * 0.4);

  // Primary gold line
  ctx.fillStyle = '#D97706';
  ctx.fillRect(centerZoneX - underlineW / 2, underlineY, underlineW, 4);

  // Center diamond ornament on underline
  ctx.save();
  ctx.translate(centerZoneX, underlineY + 2);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#B45309';
  ctx.fillRect(-7, -7, 14, 14);
  ctx.restore();

  // C. Subheading: "Scan to Enter the Weekly Draw"
  ctx.fillStyle = '#1E293B';
  ctx.font = `700 ${layout.header.subtitleFontSize}px Inter, system-ui, sans-serif`;
  ctx.letterSpacing = '0.5px';
  ctx.textAlign = 'center';
  ctx.fillText('Scan to Enter the Weekly Draw', centerZoneX, layout.header.subtitleY);

  // D. Center Coupon Container Box
  const codeBoxW = layout.couponBox.width;
  const codeBoxH = layout.couponBox.height;
  const codeBoxX = layout.couponBox.x - codeBoxW / 2;
  const codeBoxY = layout.couponBox.y;

  // White box with crimson outer stroke and gold inner stroke
  drawRoundedRect(ctx, codeBoxX, codeBoxY, codeBoxW, codeBoxH, 10, '#FFFFFF', '#881337', 2.5);
  drawRoundedRect(ctx, codeBoxX + 4, codeBoxY + 4, codeBoxW - 8, codeBoxH - 8, 6, undefined, '#D97706', 1);

  // Box title label: "COUPON CODE"
  ctx.fillStyle = '#B45309';
  ctx.font = `800 ${layout.couponBox.labelFontSize}px Inter, system-ui, sans-serif`;
  ctx.letterSpacing = '3.5px';
  ctx.textAlign = 'center';
  ctx.fillText('COUPON CODE', layout.couponBox.x, codeBoxY + Math.round(layout.couponBox.labelFontSize * 1.8));
  ctx.letterSpacing = '0px';

  // E. Footer Lines:
  // "★ Keep this coupon safe ★"
  ctx.fillStyle = '#991B1B';
  ctx.font = `italic 700 ${layout.footer.safeTextFontSize}px Inter, system-ui, sans-serif`;
  ctx.letterSpacing = '0.5px';
  ctx.textAlign = 'center';
  ctx.fillText('★ Keep this coupon safe ★', centerZoneX, layout.footer.safeTextY);

  // "BATCH: {batchId}"
  ctx.fillStyle = '#78350F';
  ctx.font = `700 ${layout.footer.batchFontSize}px Inter, system-ui, sans-serif`;
  ctx.letterSpacing = '1.5px';
  ctx.textAlign = 'center';
  ctx.fillText(`BATCH: ${config.batchId}`, centerZoneX, layout.footer.batchY);

  // Campaign season footer line
  ctx.fillStyle = '#64748B';
  ctx.font = `600 ${layout.footer.campaignFontSize}px Inter, system-ui, sans-serif`;
  ctx.letterSpacing = '0.5px';
  ctx.textAlign = 'center';
  ctx.fillText('Festive Season Campaign 2026 • Official Entry Voucher', centerZoneX, layout.footer.campaignY);

  // ----------------------------------------------------
  // 5. RIGHT ZONE
  // ----------------------------------------------------
  const rightX = layout.verificationQr.x;
  const qr2Size = layout.verificationQr.size;
  const qr2X = rightX - qr2Size / 2;
  const qr2Y = layout.verificationQr.y;
  const badgeHeight = Math.round(layout.verificationQr.badgeFontSize * 2.2);
  const badgeWidth = Math.round(qr2Size * 0.75);

  // Top header badge tag: "DRAW ENTRY"
  drawRoundedRect(
    ctx,
    rightX - badgeWidth / 2,
    qr2Y - badgeHeight,
    badgeWidth,
    badgeHeight + 2,
    { tl: 6, tr: 6, br: 0, bl: 0 },
    '#881337'
  );

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${layout.verificationQr.badgeFontSize}px Inter, system-ui, sans-serif`;
  ctx.letterSpacing = '2px';
  ctx.textAlign = 'center';
  ctx.fillText('DRAW ENTRY', rightX, qr2Y - Math.round(badgeHeight * 0.3));
  ctx.letterSpacing = '0px';

  // Verification QR White Box with Crimson Border
  drawRoundedRect(
    ctx,
    qr2X,
    qr2Y,
    qr2Size,
    qr2Size,
    { tl: 0, tr: 0, br: 6, bl: 6 },
    '#FFFFFF',
    '#881337',
    2.5
  );

  // B. Caption Banner: "SCAN HERE TO ACTIVATE"
  const bannerW = layout.activationBanner.width;
  const bannerH = layout.activationBanner.height;
  const bannerX = layout.activationBanner.x - bannerW / 2;
  const bannerY = layout.activationBanner.y;

  drawRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, 8, '#D97706');

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${layout.activationBanner.fontSize}px Inter, system-ui, sans-serif`;
  ctx.letterSpacing = '1px';
  ctx.textAlign = 'center';
  ctx.fillText('SCAN HERE TO ACTIVATE', layout.activationBanner.x, bannerY + Math.round(bannerH * 0.65));
  ctx.letterSpacing = '0px';

  // Guidance subline: "Mobile Verification"
  ctx.fillStyle = '#78350F';
  ctx.font = `700 ${layout.activationBanner.subtextFontSize}px Inter, system-ui, sans-serif`;
  ctx.letterSpacing = '0.5px';
  ctx.textAlign = 'center';
  ctx.fillText('Mobile Verification', layout.activationBanner.x, layout.activationBanner.subtextY);

  // ----------------------------------------------------
  // 6. Dashed Cutting Border around whole coupon (90mm x 50mm)
  // ----------------------------------------------------
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(2, 2, CANVAS_WIDTH - 4, CANVAS_HEIGHT - 4);
  ctx.restore();

  return canvas;
}

/**
 * Stamps dynamic coupon_code and verification QR onto a pre-rendered template canvas.
 * Returns the final high-resolution coupon canvas.
 */
export async function renderCouponToCanvas(
  templateCanvas: HTMLCanvasElement,
  coupon: CouponRenderData,
  layout?: CouponLayoutConfig
): Promise<HTMLCanvasElement> {
  const currentLayout: CouponLayoutConfig = layout || DEFAULT_LAYOUT_CONFIG;
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // 1. Draw static template base
  ctx.drawImage(templateCanvas, 0, 0);

  // 2. Draw verification QR in Right Zone
  const rightX = currentLayout.verificationQr.x;
  const qr2Size = currentLayout.verificationQr.size;
  const qr2X = rightX - qr2Size / 2;
  const qr2Y = currentLayout.verificationQr.y;
  const qr2InnerPad = Math.max(6, Math.round(qr2Size * 0.05));

  if (coupon.verificationQrDataUrl) {
    const verifQrImg = await loadImage(coupon.verificationQrDataUrl);
    ctx.drawImage(
      verifQrImg,
      qr2X + qr2InnerPad,
      qr2Y + qr2InnerPad,
      qr2Size - qr2InnerPad * 2,
      qr2Size - qr2InnerPad * 2
    );
  }

  // 3. Draw Monospaced LARGE Coupon Code in Center Zone
  const codeBoxY = currentLayout.couponBox.y;
  const codeBoxH = currentLayout.couponBox.height;

  ctx.fillStyle = '#4C0519';
  ctx.font = `900 ${currentLayout.couponBox.codeFontSize}px "JetBrains Mono", "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4.5px';
  ctx.fillText(coupon.couponCode, currentLayout.couponBox.x, codeBoxY + Math.round(codeBoxH * 0.7));
  ctx.letterSpacing = '0px';

  return canvas;
}
