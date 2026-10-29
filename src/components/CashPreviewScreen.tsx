import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle,
  Eye,
  Layers,
  Loader2,
  Printer,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { CashCouponConfig } from '../types/coupon';
import { CashCouponCard } from './CashCouponCard';
import { generateLinktreeQr, generateClaimQr } from '../utils/qr';
import { generateCashSamplePdf } from '../utils/cashPdf';
import { generateSecureToken } from '../utils/security';
import {
  formatNpr,
  getTotalPrizeQuantity,
  getTotalPrizeValue,
} from '../utils/prizeAllocation';

interface CashPreviewScreenProps {
  config: CashCouponConfig;
  onBackToConfig: () => void;
  onStartGeneration: () => void;
}

interface TierPreview {
  id: string;
  amount: number;
  quantity: number;
  codeStart: string;
  codeEnd: string;
  totalValue: number;
}

export const CashPreviewScreen: React.FC<CashPreviewScreenProps> = ({
  config,
  onBackToConfig,
  onStartGeneration,
}) => {
  const [sampleToken] = useState<string>(() => generateSecureToken());
  const [claimQrUrl, setClaimQrUrl] = useState<string>('');
  const [linktreeQrUrl, setLinktreeQrUrl] = useState<string>('');
  const [selectedTierId, setSelectedTierId] = useState<string>(
    config.prizeTiers[0]?.id || ''
  );
  const [isGeneratingSamplePdf, setIsGeneratingSamplePdf] = useState(false);
  const [samplePdfError, setSamplePdfError] = useState<string>('');

  const totalCoupons = getTotalPrizeQuantity(config.prizeTiers);
  const totalValue = getTotalPrizeValue(config.prizeTiers);

  const tiers: TierPreview[] = useMemo(
    () =>
      config.prizeTiers.map((tier, index) => {
        const offset = config.prizeTiers
          .slice(0, index)
          .reduce((total, previousTier) => total + previousTier.quantity, 0);
        const codeStart = `${config.couponPrefix}${String(
          config.startingNumber + offset
        ).padStart(5, '0')}`;
        const codeEnd = `${config.couponPrefix}${String(
          config.startingNumber + offset + tier.quantity - 1
        ).padStart(5, '0')}`;
        return {
          id: tier.id,
          amount: tier.amount,
          quantity: tier.quantity,
          codeStart,
          codeEnd,
          totalValue: tier.amount * tier.quantity,
        };
      }),
    [config.prizeTiers, config.couponPrefix, config.startingNumber]
  );

  const selectedTier = tiers.find((tier) => tier.id === selectedTierId) || tiers[0];

  useEffect(() => {
    let active = true;

    const loadQrs = async (): Promise<void> => {
      try {
        const claimQr = await generateClaimQr(config.claimBaseUrl, sampleToken);
        if (active) setClaimQrUrl(claimQr);

        if (config.includeLinktreeQr && config.linktreeUrl.trim()) {
          const followQr = await generateLinktreeQr(config.linktreeUrl);
          if (active) setLinktreeQrUrl(followQr);
        } else if (active) {
          setLinktreeQrUrl('');
        }
      } catch (error) {
        console.error('Failed to generate preview QR codes:', error);
      }
    };

    void loadQrs();

    return () => {
      active = false;
    };
  }, [config.claimBaseUrl, config.includeLinktreeQr, config.linktreeUrl, sampleToken]);

  const handleDownloadSamplePdf = async (): Promise<void> => {
    try {
      setIsGeneratingSamplePdf(true);
      setSamplePdfError('');
      const sampleBlob = await generateCashSamplePdf(config, linktreeQrUrl);
      const url = URL.createObjectURL(sampleBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sample_cash_coupon_sheet_${config.batchId.trim()}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setSamplePdfError('Could not build the sample PDF. Please try again.');
    } finally {
      setIsGeneratingSamplePdf(false);
    }
  };

  const sampleCode = selectedTier?.codeStart || `${config.couponPrefix}00001`;
  const samplePdfDisabled =
    isGeneratingSamplePdf || (config.includeLinktreeQr && !linktreeQrUrl);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/30 mb-2">
            <Eye className="w-3.5 h-3.5" />
            Live Cash Coupon Preview
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-festive tracking-wide">
            Preview the Printed Voucher
          </h2>
          <p className="text-stone-400 text-sm mt-1 max-w-2xl">
            This is the exact 15cm × 20cm (150mm × 200mm) portrait voucher. The cash prize amount is intentionally absent
            from the physical print; the claim page reveals it from the secret QR token.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBackToConfig}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-bold rounded-xl border border-stone-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Setup
          </button>
          <button
            onClick={onStartGeneration}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-red-600 hover:brightness-110 text-stone-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Full Batch
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-stone-900/80 backdrop-blur border border-stone-800 rounded-2xl p-5 sm:p-7 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-400" />
                Voucher Design (15cm × 20cm)
              </h3>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-mono">
                Sample: {sampleCode}
              </span>
            </div>

            {claimQrUrl ? (
              <CashCouponCard
                config={config}
                linktreeQrUrl={linktreeQrUrl}
                claimQrUrl={claimQrUrl}
                sampleCode={sampleCode}
              />
            ) : (
              <div className="aspect-[15/20] max-w-sm sm:max-w-md mx-auto w-full rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-center">
                <div className="flex items-center gap-2 text-stone-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  Rendering voucher artwork...
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Token validated on claim
              </div>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-amber-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Amount hidden until scan
              </div>
              <div className="rounded-lg bg-stone-800/60 border border-stone-700 px-3 py-2 text-stone-300 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                First complete claim wins
              </div>
            </div>
          </div>

          <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Printer className="w-4 h-4 text-amber-400" />
                  Test Print Sheet
                </h4>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Sample A4 test sheet with corner crop marks. No real tokens are included.
                </p>
              </div>
              <button
                onClick={handleDownloadSamplePdf}
                disabled={samplePdfDisabled}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-950 hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed text-amber-300 text-xs font-bold rounded-xl border border-amber-500/40 transition-colors"
              >
                {isGeneratingSamplePdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Printer className="w-3.5 h-3.5" />
                )}
                {isGeneratingSamplePdf ? 'Building PDF...' : 'Download Sample PDF'}
              </button>
            </div>
            {samplePdfError && (
              <p className="mt-3 text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {samplePdfError}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-5">
          <div className="bg-stone-900/80 backdrop-blur border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                Prize Tier Breakdown
              </h3>
              <span className="text-[10px] font-mono text-stone-400">
                {tiers.length} tiers
              </span>
            </div>

            <div className="space-y-2.5 max-h-[390px] overflow-y-auto pr-1">
              {tiers.map((tier) => {
                const isSelected = selectedTier?.id === tier.id;
                return (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTierId(tier.id)}
                    className={`w-full text-left rounded-xl border p-3 transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-inner'
                        : 'bg-stone-950/70 border-stone-800 hover:border-stone-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                            isSelected
                              ? 'bg-amber-500 text-stone-950'
                              : 'bg-stone-800 text-stone-300'
                          }`}
                        >
                          Rs
                        </span>
                        <span className="text-sm font-black text-white font-mono">
                          {formatNpr(tier.amount)}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-amber-300 font-mono">
                        {tier.quantity.toLocaleString()} cards
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-stone-400 font-mono">
                      <span>
                        {tier.codeStart} → {tier.codeEnd}
                      </span>
                      <span className="text-emerald-400">{formatNpr(tier.totalValue)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl bg-stone-950 border border-stone-800 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Selected sample tier</span>
                <span className="font-bold text-amber-300 font-mono">
                  {selectedTier ? formatNpr(selectedTier.amount) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Reveal on claim page</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {selectedTier ? formatNpr(selectedTier.amount) : '—'}
                </span>
              </div>
              <p className="text-[10px] text-stone-500 leading-relaxed pt-1 border-t border-stone-800">
                Every card uses the same visual design. The QR token maps to the actual tier in
                the imported manifest, so the amount is resolved server-side.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-b from-stone-900 to-stone-950 border border-amber-500/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-amber-400" />
                Batch Totals
              </h4>
              <span className="text-[10px] font-mono text-stone-400">{config.batchId}</span>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Total coupons</span>
                <span className="font-bold text-stone-100 font-mono">
                  {totalCoupons.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Total payout exposure</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {formatNpr(totalValue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Claim URL</span>
                <span className="font-mono text-[10px] text-amber-300 truncate max-w-[190px]">
                  {config.claimBaseUrl}
                </span>
              </div>
            </div>
            <button
              onClick={onStartGeneration}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-red-600 hover:brightness-110 text-stone-950 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              Generate {totalCoupons.toLocaleString()} Coupons
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-stone-500 text-center leading-relaxed">
              The manifest contains every secret token. Import it into WordPress before handing
              out cards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
