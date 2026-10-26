import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  Sparkles,
  Printer,
  Loader2,
  Sliders,
} from 'lucide-react';
import type { CouponConfig, CouponLayoutConfig } from '../types/coupon';
import { CouponCard } from './CouponCard';
import { VisualLayoutEditor } from './VisualLayoutEditor';
import { generateSamplePdf } from '../utils/pdf';

interface PreviewScreenProps {
  config: CouponConfig;
  linktreeQrUrl: string;
  sampleVerificationQrUrl: string;
  onChangeLayout: (layout: CouponLayoutConfig) => void;
  onResetLayout: () => void;
  onBackToConfig: () => void;
  onStartGeneration: () => void;
}

export const PreviewScreen: React.FC<PreviewScreenProps> = ({
  config,
  linktreeQrUrl,
  sampleVerificationQrUrl,
  onChangeLayout,
  onResetLayout,
  onBackToConfig,
  onStartGeneration,
}) => {
  const [isGeneratingSamplePdf, setIsGeneratingSamplePdf] = useState(false);
  const [isCustomizingLayout, setIsCustomizingLayout] = useState(false);
  const sampleCode = `${config.couponPrefix}${String(config.startingNumber).padStart(5, '0')}`;

  const handleDownloadSamplePdf = async () => {
    try {
      setIsGeneratingSamplePdf(true);
      const sampleBlob = await generateSamplePdf(config, linktreeQrUrl);
      const url = URL.createObjectURL(sampleBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sample_coupon_sheet_${config.batchId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate sample PDF.');
    } finally {
      setIsGeneratingSamplePdf(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900/80 backdrop-blur p-4 rounded-2xl border border-stone-800">
        <button
          onClick={onBackToConfig}
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 transition-colors w-fit cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Configuration
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle Interactive Layout Customizer */}
          <button
            onClick={() => setIsCustomizingLayout(!isCustomizingLayout)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              isCustomizingLayout
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/30'
                : 'bg-stone-950 hover:bg-stone-900 text-amber-300 border border-amber-500/40'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isCustomizingLayout ? 'Done Customizing Layout' : '🎨 Drag & Customize Layout'}</span>
          </button>

          <button
            onClick={handleDownloadSamplePdf}
            disabled={isGeneratingSamplePdf}
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-950 hover:bg-stone-900 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/40 transition-colors cursor-pointer"
          >
            {isGeneratingSamplePdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Printer className="w-3.5 h-3.5 text-amber-400" />
            )}
            Download 1-Page Test PDF (10 Cards)
          </button>

          <button
            onClick={onStartGeneration}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:brightness-110 text-stone-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <span>Proceed to Generate ({config.totalQuantity.toLocaleString()})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left / Center: Interactive Preview (8 Cols or Full Width during Edit) */}
        <div className={isCustomizingLayout ? 'lg:col-span-12 space-y-6' : 'lg:col-span-8 space-y-6'}>
          <div className="bg-stone-900/90 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-amber-400" />
                  Live Physical Coupon Preview
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Standard visiting card aspect (<span className="font-mono text-amber-300 font-bold">90mm × 50mm</span>) • Sample <span className="font-mono text-amber-300 font-bold">{sampleCode}</span>
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {isCustomizingLayout && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    ✏️ Drag &amp; Resize Active
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  100% Print Ready
                </span>
              </div>
            </div>

            {/* Render Coupon Card Container */}
            <div className="py-2 flex justify-center">
              <div className="w-full max-w-2xl relative">
                <CouponCard
                  config={config}
                  linktreeQrUrl={linktreeQrUrl}
                  verificationQrUrl={sampleVerificationQrUrl}
                  sampleCode={sampleCode}
                />

                {/* Interactive WYSIWYG Drag Overlay when customizing */}
                {isCustomizingLayout && (
                  <div className="absolute inset-0">
                    <VisualLayoutEditor
                      config={config}
                      onChangeLayout={onChangeLayout}
                      onResetLayout={onResetLayout}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* If Customizing Layout, show the inspector below */}
            {isCustomizingLayout && (
              <div className="pt-2">
                <VisualLayoutEditor
                  config={config}
                  onChangeLayout={onChangeLayout}
                  onResetLayout={onResetLayout}
                />
              </div>
            )}

            {/* Layout Specifications Inspection */}
            {!isCustomizingLayout && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800/80">
                  <span className="text-stone-400 block text-[10px] uppercase font-bold text-amber-400 mb-1">
                    Left Zone (31%)
                  </span>
                  <p className="text-stone-300 font-medium">Extra Large Logo</p>
                  <p className="text-stone-400 text-[11px] font-mono">{config.phoneNumber}</p>
                  <p className="text-stone-400 text-[11px]">Linktree QR (EC: M, 230px)</p>
                </div>

                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800/80">
                  <span className="text-stone-400 block text-[10px] uppercase font-bold text-amber-400 mb-1">
                    Centre Zone (37%)
                  </span>
                  <p className="text-stone-300 font-medium">FESTIVAL PACKAGE</p>
                  <p className="text-amber-300 font-mono font-bold text-xs">{sampleCode}</p>
                  <p className="text-stone-400 text-[11px]">Large Monospaced Code</p>
                </div>

                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800/80">
                  <span className="text-stone-400 block text-[10px] uppercase font-bold text-amber-400 mb-1">
                    Right Zone (32%)
                  </span>
                  <p className="text-stone-300 font-medium">Verification QR (EC: Q, 245px)</p>
                  <p className="text-amber-300 font-bold text-[11px]">SCAN HERE TO ACTIVATE</p>
                  <p className="text-stone-400 text-[10px] font-mono truncate">?t=[32-char-token]</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Verification & Pre-flight Checklist (4 Cols, hidden during wide edit mode) */}
        {!isCustomizingLayout && (
          <div className="lg:col-span-4 space-y-6">
            
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-5">
              <h4 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Pre-flight Checklist
              </h4>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-stone-950/60 border border-stone-800">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">✓</div>
                  <div>
                    <strong className="text-stone-200">Standard Visiting Card Scale</strong>
                    <p className="text-stone-400 text-[11px]">
                      Calibrated to 90mm × 50mm landscape visiting card size for commercial cutting.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-stone-950/60 border border-stone-800">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">✓</div>
                  <div>
                    <strong className="text-stone-200">Dual QR Code Isolation</strong>
                    <p className="text-stone-400 text-[11px]">
                      Linktree (Follow Us) and Verification (Scan Here To Activate) are distinctly separated.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-stone-950/60 border border-stone-800">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">✓</div>
                  <div>
                    <strong className="text-stone-200">Pure White Quiet Zones</strong>
                    <p className="text-stone-400 text-[11px]">
                      All QR codes are encased in solid white modules with &gt;4mm quiet zones to guarantee scannability.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-stone-950/60 border border-stone-800">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">✓</div>
                  <div>
                    <strong className="text-stone-200">A4 2×5 Grid Alignment</strong>
                    <p className="text-stone-400 text-[11px]">
                      10 coupons per sheet with 5mm gutters and standard cutting tick marks for paper guillotines.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onStartGeneration}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:brightness-110 text-stone-950 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Batch Generation</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
