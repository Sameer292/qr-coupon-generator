import React, { useEffect, useRef, useState } from 'react';
import type { CouponConfig } from '../types/coupon';
import { createStaticCouponTemplate, renderCouponToCanvas, CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/couponCanvas';

interface CouponCardProps {
  config: CouponConfig;
  linktreeQrUrl: string;
  verificationQrUrl: string;
  sampleCode?: string;
  scale?: number;
}

export const CouponCard: React.FC<CouponCardProps> = ({
  config,
  linktreeQrUrl,
  verificationQrUrl,
  sampleCode = 'FM-00001',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let active = true;

    async function renderPreview() {
      if (!linktreeQrUrl || !verificationQrUrl || !config.logoDataUrl) {
        return;
      }

      try {
        setIsRendering(true);
        // Ensure web fonts (Cinzel, Inter, JetBrains Mono) are ready
        if (typeof document !== 'undefined' && document.fonts) {
          await document.fonts.ready;
        }

        const templateCanvas = await createStaticCouponTemplate(config, linktreeQrUrl);
        const finalCanvas = await renderCouponToCanvas(
          templateCanvas,
          {
            couponCode: sampleCode,
            verificationQrDataUrl: verificationQrUrl,
          },
          config.layout
        );

        if (!active) return;

        const displayCanvas = canvasRef.current;
        if (displayCanvas) {
          displayCanvas.width = CANVAS_WIDTH;
          displayCanvas.height = CANVAS_HEIGHT;
          const ctx = displayCanvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.drawImage(finalCanvas, 0, 0);
          }
        }
      } catch (err) {
        console.error('Error rendering live coupon preview canvas:', err);
      } finally {
        if (active) setIsRendering(false);
      }
    }

    renderPreview();

    return () => {
      active = false;
    };
  }, [config, linktreeQrUrl, verificationQrUrl, sampleCode]);

  return (
    <div className="relative select-none transition-transform duration-200">
      {/* 90mm x 50mm Aspect Ratio Container (1.8:1) */}
      <div 
        className="relative w-full aspect-[90/50] rounded-xl overflow-hidden shadow-2xl bg-[#FAF6EE] flex items-center justify-center border border-amber-900/20"
        style={{
          boxShadow: '0 12px 35px -5px rgba(0,0,0,0.45), 0 0 20px 2px rgba(217, 119, 6, 0.2)'
        }}
      >
        {/* Rendered Live Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className={`w-full h-full object-contain rounded-lg transition-opacity duration-200 ${
            isRendering ? 'opacity-80' : 'opacity-100'
          }`}
        />

        {isRendering && (
          <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex items-center gap-2 bg-stone-900/90 text-amber-300 text-xs px-3 py-1.5 rounded-lg border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Updating live preview...
            </div>
          </div>
        )}
      </div>

      {/* Cutting guide badge */}
      <div className="flex items-center justify-between text-[11px] text-stone-400 mt-2 px-1">
        <span className="flex items-center gap-1 font-mono text-[10px]">
          <span className="inline-block w-2.5 h-2.5 border border-dashed border-stone-400 bg-amber-50 rounded-sm" />
          Standard Visiting Card Size (90mm × 50mm • 10 cards/page)
        </span>
        <span className="text-amber-400 font-medium text-[10px]">
          Pure White QR Quiet Zone ≥ 4mm
        </span>
      </div>
    </div>
  );
};
