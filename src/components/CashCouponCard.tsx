import React, { useEffect, useRef, useState } from 'react';
import type { CashCouponConfig } from '../types/coupon';
import {
  CASH_CANVAS_HEIGHT,
  CASH_CANVAS_WIDTH,
  createCashCouponTemplate,
  renderCashCouponToCanvas,
} from '../utils/cashCouponCanvas';

interface CashCouponCardProps {
  config: CashCouponConfig;
  linktreeQrUrl: string;
  claimQrUrl: string;
  sampleCode?: string;
}

export const CashCouponCard: React.FC<CashCouponCardProps> = ({
  config,
  linktreeQrUrl,
  claimQrUrl,
  sampleCode = 'FM-00001',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let active = true;

    const renderPreview = async (): Promise<void> => {
      if (!claimQrUrl || !config.logoDataUrl) return;
      if (config.includeLinktreeQr && !linktreeQrUrl) return;

      try {
        setIsRendering(true);
        if (typeof document !== 'undefined' && document.fonts) {
          await document.fonts.ready;
        }

        const templateCanvas = await createCashCouponTemplate(
          config,
          config.includeLinktreeQr ? linktreeQrUrl : undefined
        );
        const finalCanvas = await renderCashCouponToCanvas(templateCanvas, {
          couponCode: sampleCode,
          claimQrDataUrl: claimQrUrl,
        });

        if (!active) return;
        const displayCanvas = canvasRef.current;
        if (displayCanvas) {
          displayCanvas.width = CASH_CANVAS_WIDTH;
          displayCanvas.height = CASH_CANVAS_HEIGHT;
          const ctx = displayCanvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, CASH_CANVAS_WIDTH, CASH_CANVAS_HEIGHT);
            ctx.drawImage(finalCanvas, 0, 0);
          }
        }
      } catch (error) {
        console.error('Error rendering cash coupon preview:', error);
      } finally {
        if (active) setIsRendering(false);
      }
    };

    void renderPreview();

    return () => {
      active = false;
    };
  }, [config, linktreeQrUrl, claimQrUrl, sampleCode]);

  return (
    <div className="relative select-none transition-transform duration-200 max-w-sm sm:max-w-md mx-auto">
      <div
        className="relative w-full aspect-[15/20] rounded-2xl overflow-hidden shadow-2xl bg-[#FAF6EE] flex items-center justify-center border border-amber-900/20"
        style={{
          boxShadow:
            '0 18px 45px -5px rgba(0,0,0,0.5), 0 0 25px 2px rgba(217, 119, 6, 0.25)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CASH_CANVAS_WIDTH}
          height={CASH_CANVAS_HEIGHT}
          className={`w-full h-full object-contain rounded-xl transition-opacity duration-200 ${
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

      <div className="flex items-center justify-between text-[11px] text-stone-400 mt-2.5 px-1">
        <span className="flex items-center gap-1 font-mono text-[10px]">
          <span className="inline-block w-2.5 h-2.5 border border-dashed border-stone-400 bg-amber-50 rounded-sm" />
          150mm × 200mm (15cm × 20cm • Portrait Voucher)
        </span>
        <span className="text-amber-400 font-medium text-[10px]">
          Amount hidden until scan
        </span>
      </div>
    </div>
  );
};
