import React, { useRef } from 'react';
import {
  Upload,
  RefreshCw,
  Phone,
  Link,
  ShieldAlert,
  Hash,
  Layers,
  FileCheck,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Printer,
} from 'lucide-react';
import type { CouponConfig, ValidationErrors } from '../types/coupon';
import { DEFAULT_LOGO_DATA_URL } from '../utils/defaultLogo';

interface ConfigScreenProps {
  config: CouponConfig;
  onChange: (updated: Partial<CouponConfig>) => void;
  errors: ValidationErrors;
  isValid: boolean;
  onProceedToPreview: () => void;
  onDirectGenerate: () => void;
}

export const ConfigScreen: React.FC<ConfigScreenProps> = ({
  config,
  onChange,
  errors,
  isValid,
  onProceedToPreview,
  onDirectGenerate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png') && !file.type.includes('svg') && !file.type.includes('jpeg')) {
      alert('Please upload a valid PNG or SVG image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onChange({ logoDataUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  const resetDefaultLogo = () => {
    onChange({ logoDataUrl: DEFAULT_LOGO_DATA_URL });
  };

  // Calculations for summary
  const totalPdfs = Math.ceil((config.totalQuantity || 0) / (config.couponsPerPdf || 250));
  const totalPages = Math.ceil((config.totalQuantity || 0) / 10);
  const endSequence = (config.startingNumber || 1) + (config.totalQuantity || 0) - 1;
  const startCode = `${config.couponPrefix || 'FM-'}${String(config.startingNumber || 1).padStart(5, '0')}`;
  const endCode = `${config.couponPrefix || 'FM-'}${String(endSequence).padStart(5, '0')}`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Intro Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950 via-stone-900 to-amber-950 p-6 sm:p-8 border border-amber-500/30 shadow-festive-glow">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40">
              <Sparkles className="w-3.5 h-3.5" />
              Campaign Operations Hub
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-festive tracking-wide">
              Festive Coupon Batch Configuration
            </h2>
            <p className="text-stone-300 text-sm max-w-2xl leading-relaxed">
              Configure parameters to generate high-resolution print-ready PDFs (10 coupons per A4 sheet) and the cryptographic <code className="text-amber-300 bg-stone-950/60 px-1.5 py-0.5 rounded font-mono text-xs">manifest.csv</code> for secure WordPress import.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={onProceedToPreview}
              disabled={!isValid}
              className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                isValid
                  ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 text-stone-950 hover:brightness-110 active:scale-95 shadow-amber-500/25 cursor-pointer'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
              }`}
            >
              <span>Live Preview</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form Inputs (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-stone-900/80 backdrop-blur border border-stone-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
            
            <div className="border-b border-stone-800 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">1</span>
                  Brand & Campaign Identity
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Customise logo, contact numbers, and navigation URLs</p>
              </div>
            </div>

            {/* 1. Logo Upload & Live Preview */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                1. Fresh Masala Logo (PNG or SVG) <span className="text-red-400">*</span>
              </label>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-stone-950/70 p-4 rounded-xl border border-stone-800">
                {/* Logo Preview Card */}
                <div className="w-48 h-20 bg-gradient-to-r from-[#4a0408] to-[#2c0205] border border-amber-500/40 rounded-lg p-2 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                  {config.logoDataUrl ? (
                    <img
                      src={config.logoDataUrl}
                      alt="Brand Logo Preview"
                      className="max-h-full max-w-full object-contain filter drop-shadow"
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
                      onClick={resetDefaultLogo}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-amber-300 text-xs font-semibold rounded-lg border border-stone-800 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Default Fresh Masala Logo
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Accepts crisp PNG or vector SVG with transparent or dark background.
                  </p>
                </div>
              </div>
              {errors.logoDataUrl && (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.logoDataUrl}
                </p>
              )}
            </div>

            {/* 2 & 3: Mobile / WhatsApp Number & Office Landline Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mobile / WhatsApp Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                  2. Mobile / WhatsApp Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <Phone className="w-4 h-4 text-emerald-400" />
                  </div>
                  <input
                    type="text"
                    value={config.phoneNumber}
                    onChange={(e) => onChange({ phoneNumber: e.target.value })}
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

              {/* Office Landline Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                    3. Office Landline Number
                  </label>
                  <span className="text-[10px] text-stone-400">Optional</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <Phone className="w-4 h-4 text-amber-500" />
                  </div>
                  <input
                    type="text"
                    value={config.landlineNumber || ''}
                    onChange={(e) => onChange({ landlineNumber: e.target.value })}
                    placeholder="01-5912345 / +977-01-XXXXXXX"
                    className="w-full bg-stone-950 pl-10 pr-3 py-2.5 rounded-xl border border-stone-700 text-sm text-stone-100 placeholder-stone-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-stone-500">
                  Appears on the coupon alongside the mobile contact.
                </p>
              </div>
            </div>

            {/* 4 & 5: Linktree URL & Verification Base URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Linktree URL */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                  4. Linktree URL (Same for all) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <Link className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={config.linktreeUrl}
                    onChange={(e) => onChange({ linktreeUrl: e.target.value })}
                    placeholder="https://linktr.ee/freshmasala"
                    className={`w-full bg-stone-950 pl-10 pr-3 py-2.5 rounded-xl border text-sm text-stone-100 placeholder-stone-600 focus:outline-none transition-all ${
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

              {/* Verification Base URL */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                  5. Verification Base URL (WP Endpoint) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                  </div>
                  <input
                    type="url"
                    value={config.verificationBaseUrl}
                    onChange={(e) => onChange({ verificationBaseUrl: e.target.value })}
                    placeholder="https://freshmasala.com.np/verify/"
                    className={`w-full bg-stone-950 pl-10 pr-3 py-2.5 rounded-xl border text-sm text-stone-100 placeholder-stone-600 focus:outline-none font-mono transition-all ${
                      errors.verificationBaseUrl
                        ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-stone-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                    }`}
                  />
                </div>
                {errors.verificationBaseUrl && (
                  <p className="text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.verificationBaseUrl}
                  </p>
                )}
              </div>
            </div>
            <p className="text-[11px] text-stone-400">
              Verification QR codes encode: <code className="text-amber-300 font-mono text-[10px]">{config.verificationBaseUrl}?t=[32-char-token]</code>
            </p>

            <div className="border-t border-stone-800 pt-6">
              <div className="border-b border-stone-800 pb-4 mb-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">2</span>
                  Sequence & Batch Numbers
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Configure quantity, numbering format, and PDF bundling</p>
              </div>

              {/* 5, 6, 8: Prefix, Starting Sequence, Batch ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Prefix */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                    5. Prefix <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={config.couponPrefix}
                      onChange={(e) => onChange({ couponPrefix: e.target.value.toUpperCase() })}
                      placeholder="FM-"
                      className={`w-full bg-stone-950 px-3 py-2.5 rounded-xl border text-sm font-mono text-stone-100 placeholder-stone-600 uppercase focus:outline-none transition-all ${
                        errors.couponPrefix
                          ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                          : 'border-stone-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                      }`}
                    />
                  </div>
                  {errors.couponPrefix && (
                    <p className="text-xs text-rose-400">{errors.couponPrefix}</p>
                  )}
                </div>

                {/* Starting Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                    6. Start Number <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                      <Hash className="w-4 h-4" />
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={999999}
                      value={config.startingNumber}
                      onChange={(e) => onChange({ startingNumber: parseInt(e.target.value, 10) || 1 })}
                      className={`w-full bg-stone-950 pl-10 pr-3 py-2.5 rounded-xl border text-sm font-mono text-stone-100 placeholder-stone-600 focus:outline-none transition-all ${
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

                {/* Batch ID */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                    8. Batch ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.batchId}
                    onChange={(e) => onChange({ batchId: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
                    placeholder="BATCH-2026-01"
                    className={`w-full bg-stone-950 px-3 py-2.5 rounded-xl border text-sm font-mono text-stone-100 placeholder-stone-600 uppercase focus:outline-none transition-all ${
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

              {/* 7 & 9: Quantity & Coupons per PDF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {/* Total Quantity */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                      7. Total Quantity <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-stone-400">Max: 20,000</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                      <Layers className="w-4 h-4 text-amber-500" />
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={20000}
                      step={100}
                      value={config.totalQuantity}
                      onChange={(e) => onChange({ totalQuantity: parseInt(e.target.value, 10) || 0 })}
                      className={`w-full bg-stone-950 pl-10 pr-3 py-2.5 rounded-xl border text-sm font-bold text-amber-300 focus:outline-none transition-all ${
                        errors.totalQuantity
                          ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                          : 'border-stone-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                      }`}
                    />
                  </div>
                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[500, 1000, 2500, 5000, 10000, 20000].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => onChange({ totalQuantity: qty })}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          config.totalQuantity === qty
                            ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                            : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 border-stone-700'
                        }`}
                      >
                        {qty.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  {errors.totalQuantity && (
                    <p className="text-xs text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.totalQuantity}
                    </p>
                  )}
                </div>

                {/* Coupons per PDF */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                    9. Coupons Per PDF File <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={config.couponsPerPdf}
                      onChange={(e) => onChange({ couponsPerPdf: parseInt(e.target.value, 10) as 100 | 250 | 500 })}
                      className="w-full bg-stone-950 px-3 py-2.5 rounded-xl border border-stone-700 text-sm font-semibold text-stone-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value={100}>100 coupons / file (10 A4 pages)</option>
                      <option value={250}>250 coupons / file (25 A4 pages - Recommended)</option>
                      <option value={500}>500 coupons / file (50 A4 pages)</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Splits massive runs into manageable printer batches to prevent spool timeouts.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Live Run Summary & Quick Actions (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-20 space-y-6">
            
            {/* Batch Run Preview Card */}
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
                    {(config.totalQuantity || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-stone-800/60">
                  <span className="text-stone-400">Sequence Range:</span>
                  <span className="font-bold text-stone-200 font-mono">
                    {startCode} → {endCode}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-stone-800/60">
                  <span className="text-stone-400">PDF Files Output:</span>
                  <span className="font-bold text-stone-200">
                    {totalPdfs} {totalPdfs === 1 ? 'file' : 'files'} ({config.couponsPerPdf}/file)
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-stone-800/60">
                  <span className="text-stone-400">Total A4 Sheets:</span>
                  <span className="font-bold text-stone-200">
                    {totalPages.toLocaleString()} pages (10 cards/page)
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-stone-800/60">
                  <span className="text-stone-400">Grid Template:</span>
                  <span className="font-medium text-stone-300">
                    2 cols × 5 rows (90×50mm)
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-stone-400">Manifest CSV:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    manifest.csv
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
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
                  <span>View Live Sample Coupon</span>
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

            {/* Security Guarantee Notice */}
            <div className="bg-stone-950/80 border border-emerald-500/30 rounded-xl p-4 text-xs space-y-2 text-stone-300">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <ShieldAlert className="w-4 h-4" />
                Zero Collision &amp; Pure Offline
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Tokens are 32-character Base64URL strings generated via Web Crypto API. No data leaves your machine.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
