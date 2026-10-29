import React, { useRef } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  FileCheck,
  Hash,
  Link,
  ListChecks,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import type { CashCouponConfig, CashValidationErrors } from '../types/coupon';
import { DEFAULT_LOGO_DATA_URL } from '../utils/defaultLogo';
import {
  formatNpr,
  getTotalPrizeQuantity,
  getTotalPrizeValue,
} from '../utils/prizeAllocation';

interface CashConfigScreenProps {
  config: CashCouponConfig;
  onChange: (updated: Partial<CashCouponConfig>) => void;
  errors: CashValidationErrors;
  isValid: boolean;
  onProceedToPreview: () => void;
  onDirectGenerate: () => void;
}

export const CashConfigScreen: React.FC<CashConfigScreenProps> = ({
  config,
  onChange,
  errors,
  isValid,
  onProceedToPreview,
  onDirectGenerate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCoupons = getTotalPrizeQuantity(config.prizeTiers);
  const totalValue = getTotalPrizeValue(config.prizeTiers);
  const totalPdfs = config.prizeTiers.reduce(
    (total, tier) => total + Math.ceil(Math.max(tier.quantity, 0) / config.couponsPerPdf),
    0
  );
  const totalPages = config.prizeTiers.reduce(
    (total, tier) => total + Math.ceil(Math.max(tier.quantity, 0) / 10),
    0
  );
  const endSequence = (config.startingNumber || 1) + totalCoupons - 1;
  const startCode = `${config.couponPrefix || 'FM-'}${String(config.startingNumber || 1).padStart(5, '0')}`;
  const endCode = `${config.couponPrefix || 'FM-'}${String(Math.max(endSequence, config.startingNumber || 1)).padStart(5, '0')}`;

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.includes('png') && !file.type.includes('svg') && !file.type.includes('jpeg')) {
      alert('Please upload a valid PNG, SVG, or JPEG image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const dataUrl = readerEvent.target?.result;
      if (typeof dataUrl === 'string') {
        onChange({ logoDataUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  const updateTier = (id: string, field: 'amount' | 'quantity', value: number): void => {
    onChange({
      prizeTiers: config.prizeTiers.map((tier) =>
        tier.id === id ? { ...tier, [field]: value } : tier
      ),
    });
  };

  const addTier = (): void => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `tier-${Date.now()}`;
    onChange({
      prizeTiers: [...config.prizeTiers, { id, amount: 0, quantity: 0 }],
    });
  };

  const removeTier = (id: string): void => {
    onChange({ prizeTiers: config.prizeTiers.filter((tier) => tier.id !== id) });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950 via-stone-900 to-amber-950 p-6 sm:p-8 border border-amber-500/30 shadow-festive-glow">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40">
              <Banknote className="w-3.5 h-3.5" />
              Cash Prize Campaign
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-festive tracking-wide">
              Cash Prize Batch Setup
            </h2>
            <p className="text-stone-300 text-sm max-w-2xl leading-relaxed">
              Set the exact number of coupons for each cash amount. The amount is hidden on the
              printed card and revealed only after the customer scans the claim QR.
            </p>
          </div>

          <button
            onClick={onProceedToPreview}
            disabled={!isValid}
            className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
              isValid
                ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 text-stone-950 hover:brightness-110 active:scale-95 shadow-amber-500/25 cursor-pointer'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
            }`}
          >
            <span>Preview Cards</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-stone-900/80 backdrop-blur border border-stone-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
            <div className="border-b border-stone-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">
                  1
                </span>
                Brand & Claim Destination
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                The QR points to the WordPress claim page. Set this URL before printing.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                Fresh Masala Logo <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-stone-950/70 p-4 rounded-xl border border-stone-800">
                <div className="w-48 h-20 bg-gradient-to-r from-[#4a0408] to-[#2c0205] border border-amber-500/40 rounded-lg p-2 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                  {config.logoDataUrl ? (
                    <img
                      src={config.logoDataUrl}
                      alt="Brand logo preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-stone-500">No logo selected</span>
                  )}
                </div>
                <div className="flex-1 space-y-2 w-full">
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/svg+xml, image/jpeg"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg border border-stone-700 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      Upload Logo
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ logoDataUrl: DEFAULT_LOGO_DATA_URL })}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-amber-300 text-xs font-semibold rounded-lg border border-stone-800 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Default Logo
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    PNG, SVG, or JPEG. Transparent backgrounds work best.
                  </p>
                </div>
              </div>
              {errors.logoDataUrl && (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.logoDataUrl}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                  Mobile / WhatsApp <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={config.phoneNumber}
                    onChange={(event) => onChange({ phoneNumber: event.target.value })}
                    placeholder="+977-9801234567"
                    className={`w-full bg-stone-950 pl-10 pr-3 py-2.5 rounded-xl border text-sm text-stone-100 placeholder-stone-600 focus:outline-none transition-all ${
                      errors.phoneNumber
                        ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-stone-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                    }`}
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.phoneNumber}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                    Office Landline
                  </label>
                  <span className="text-[10px] text-stone-400">Optional</span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={config.landlineNumber || ''}
                    onChange={(event) => onChange({ landlineNumber: event.target.value })}
                    placeholder="01-5912345"
                    className="w-full bg-stone-950 pl-10 pr-3 py-2.5 rounded-xl border border-stone-700 text-sm text-stone-100 placeholder-stone-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                  Claim Page URL <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <ShieldAlert className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={config.claimBaseUrl}
                    onChange={(event) => onChange({ claimBaseUrl: event.target.value })}
                    placeholder="https://freshmasala.com.np/claim/"
                    className={`w-full bg-stone-950 pl-10 pr-3 py-2.5 rounded-xl border text-sm font-mono text-stone-100 placeholder-stone-600 focus:outline-none transition-all ${
                      errors.claimBaseUrl
                        ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-stone-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                    }`}
                  />
                </div>
                {errors.claimBaseUrl ? (
                  <p className="text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.claimBaseUrl}
                  </p>
                ) : (
                  <p className="text-[11px] text-stone-500">
                    QR payload: <code className="text-amber-300">{config.claimBaseUrl || 'https://site/claim/'}?t=[token]</code>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                    Follow QR
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-stone-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeLinktreeQr}
                      onChange={(event) => onChange({ includeLinktreeQr: event.target.checked })}
                      className="accent-amber-500"
                    />
                    Include Linktree QR
                  </label>
                </div>
                <div className="relative">
                  <Link className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={config.linktreeUrl}
                    onChange={(event) => onChange({ linktreeUrl: event.target.value })}
                    placeholder="https://linktr.ee/freshmasala"
                    disabled={!config.includeLinktreeQr}
                    className={`w-full bg-stone-950 pl-10 pr-3 py-2.5 rounded-xl border text-sm text-stone-100 placeholder-stone-600 focus:outline-none transition-all disabled:opacity-50 ${
                      errors.linktreeUrl
                        ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-stone-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                    }`}
                  />
                </div>
                {errors.linktreeUrl && (
                  <p className="text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.linktreeUrl}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-stone-900/80 backdrop-blur border border-stone-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-5">
            <div className="border-b border-stone-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">
                  2
                </span>
                Prize Tiers
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Exact counts per cash amount. Coupons are grouped by tier for printing.
              </p>
            </div>

            <div className="space-y-3">
              {config.prizeTiers.map((tier, index) => {
                const tierError = errors.tierErrors?.[tier.id];
                return (
                  <div
                    key={tier.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-stone-950/70 border border-stone-800 rounded-xl p-3.5"
                  >
                    <div className="sm:col-span-1">
                      <span className="inline-flex w-8 h-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-black">
                        {index + 1}
                      </span>
                    </div>
                    <div className="sm:col-span-4 space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Cash Prize (NPR)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-xs font-bold">
                          Rs.
                        </span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={tier.amount || ''}
                          onChange={(event) =>
                            updateTier(tier.id, 'amount', parseInt(event.target.value, 10) || 0)
                          }
                          className={`w-full bg-stone-950 pl-10 pr-3 py-2.5 rounded-xl border text-sm font-mono text-stone-100 focus:outline-none ${
                            tierError?.amount
                              ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                              : 'border-stone-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                          }`}
                        />
                      </div>
                      {tierError?.amount && (
                        <p className="text-[11px] text-rose-400">{tierError.amount}</p>
                      )}
                    </div>
                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Coupons
                      </label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={tier.quantity || ''}
                        onChange={(event) =>
                          updateTier(tier.id, 'quantity', parseInt(event.target.value, 10) || 0)
                        }
                        className={`w-full bg-stone-950 px-3 py-2.5 rounded-xl border text-sm font-mono text-stone-100 focus:outline-none ${
                          tierError?.quantity
                            ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                            : 'border-stone-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                        }`}
                      />
                      {tierError?.quantity && (
                        <p className="text-[11px] text-rose-400">{tierError.quantity}</p>
                      )}
                    </div>
                    <div className="sm:col-span-3">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                        Tier Value
                      </span>
                      <div className="px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-sm font-bold text-amber-300 font-mono">
                        {formatNpr((tier.amount || 0) * (tier.quantity || 0))}
                      </div>
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeTier(tier.id)}
                        aria-label={`Remove prize tier ${index + 1}`}
                        className="p-2.5 rounded-lg bg-stone-900 hover:bg-rose-950/60 text-stone-400 hover:text-rose-300 border border-stone-800 hover:border-rose-500/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={addTier}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-950 hover:bg-stone-900 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/40 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Prize Tier
              </button>
              {errors.prizeTiers && (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.prizeTiers}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-800">
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Coupons</span>
                <span className="text-lg font-black text-amber-300 font-mono">
                  {totalCoupons.toLocaleString()}
                </span>
              </div>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Payout</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {formatNpr(totalValue)}
                </span>
              </div>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Tiers</span>
                <span className="text-lg font-black text-stone-200 font-mono">
                  {config.prizeTiers.length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-stone-900/80 backdrop-blur border border-stone-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-5">
            <div className="border-b border-stone-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">
                  3
                </span>
                Batch & Sequence
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Codes are sequential and grouped by prize tier.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                  Prefix <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={config.couponPrefix}
                  onChange={(event) => onChange({ couponPrefix: event.target.value.toUpperCase() })}
                  placeholder="FM-"
                  maxLength={30}
                  className={`w-full bg-stone-950 px-3 py-2.5 rounded-xl border text-sm font-mono text-stone-100 uppercase focus:outline-none ${
                    errors.couponPrefix
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-stone-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                  }`}
                />
                {errors.couponPrefix && (
                  <p className="text-xs text-rose-400">{errors.couponPrefix}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                  Start Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={config.startingNumber}
                    onChange={(event) =>
                      onChange({ startingNumber: parseInt(event.target.value, 10) || 1 })
                    }
                    className={`w-full bg-stone-950 pl-10 pr-3 py-2.5 rounded-xl border text-sm font-mono text-stone-100 focus:outline-none ${
                      errors.startingNumber
                        ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-stone-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                    }`}
                  />
                </div>
                {errors.startingNumber && (
                  <p className="text-xs text-rose-400">{errors.startingNumber}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                  Batch ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={config.batchId}
                  onChange={(event) =>
                    onChange({
                      batchId: event.target.value.toUpperCase().replace(/\s+/g, '-'),
                    })
                  }
                  placeholder="CASH-2026-01"
                  maxLength={50}
                  className={`w-full bg-stone-950 px-3 py-2.5 rounded-xl border text-sm font-mono text-stone-100 uppercase focus:outline-none ${
                    errors.batchId
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-stone-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                  }`}
                />
                {errors.batchId && (
                  <p className="text-xs text-rose-400">{errors.batchId}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                  Coupons Per PDF <span className="text-red-400">*</span>
                </label>
                <select
                  value={config.couponsPerPdf}
                  onChange={(event) =>
                    onChange({
                      couponsPerPdf: parseInt(event.target.value, 10) as 100 | 250 | 500,
                    })
                  }
                  className="w-full bg-stone-950 px-3 py-2.5 rounded-xl border border-stone-700 text-sm font-semibold text-stone-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value={100}>100 coupons / file (10 A4 pages)</option>
                  <option value={250}>250 coupons / file (25 A4 pages — Recommended)</option>
                  <option value={500}>500 coupons / file (50 A4 pages)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                  Code Range
                </span>
                <div className="px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-sm font-mono text-amber-300">
                  {startCode} → {endCode}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-20 space-y-6">
            <div className="bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3.5">
                <h4 className="text-sm font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-amber-400" />
                  Batch Summary
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-800 text-stone-300 border border-stone-700">
                  {config.batchId || 'UNNAMED'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-stone-800/60">
                  <span className="text-stone-400">Total Coupons:</span>
                  <span className="font-bold text-base text-amber-300 font-mono">
                    {totalCoupons.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-stone-800/60">
                  <span className="text-stone-400">Total Payout:</span>
                  <span className="font-bold text-base text-emerald-400 font-mono">
                    {formatNpr(totalValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-stone-800/60">
                  <span className="text-stone-400">Prize Tiers:</span>
                  <span className="font-bold text-stone-200">{config.prizeTiers.length}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-stone-800/60">
                  <span className="text-stone-400">PDF Files:</span>
                  <span className="font-bold text-stone-200">{totalPdfs}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-stone-800/60">
                  <span className="text-stone-400">A4 Sheets:</span>
                  <span className="font-bold text-stone-200">{totalPages.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-stone-400">Manifest:</span>
                  <span className="font-mono text-emerald-400 font-semibold">manifest.csv</span>
                </div>
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-[11px] text-amber-200 leading-relaxed flex items-start gap-2">
                <Wallet className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  The cash amount is <strong>not printed</strong>. Customers see it only after
                  scanning. The first complete claim submission wins.
                </span>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  onClick={onProceedToPreview}
                  disabled={!isValid}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-md ${
                    isValid
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-amber-500/20 active:scale-98 cursor-pointer'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>View Live Card Preview</span>
                </button>
                <button
                  onClick={onDirectGenerate}
                  disabled={!isValid}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs transition-all border ${
                    isValid
                      ? 'bg-stone-900 hover:bg-stone-800 text-amber-300 border-amber-500/40 active:scale-98 cursor-pointer'
                      : 'bg-stone-900 text-stone-600 border-stone-800 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Start Bulk Generation Directly</span>
                </button>
              </div>
            </div>

            <div className="bg-stone-950/80 border border-emerald-500/30 rounded-xl p-4 text-xs space-y-2 text-stone-300">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <ListChecks className="w-4 h-4" />
                Secure Token Manifest
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Tokens are 32-character Base64URL strings generated with Web Crypto. Import the
                manifest before distributing cards, and keep it private.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
