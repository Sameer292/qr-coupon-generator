import React, { useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Check,
  Clock,
  Download,
  FileArchive,
  FileJson,
  FileSpreadsheet,
  Layers,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  CashGeneratedBatchData,
  CashPdfFileInfo,
  GenerationProgress,
} from '../types/coupon';
import {
  downloadCashBatchSummaryJson,
  downloadCashManifestCsv,
} from '../utils/cashCsv';
import { bundleCashBatchToZip } from '../utils/cashZip';
import { downloadZipBlob } from '../utils/zip';
import { formatNpr } from '../utils/prizeAllocation';

interface CashGenerationScreenProps {
  progress: GenerationProgress;
  batchData: CashGeneratedBatchData | null;
  pdfFiles: CashPdfFileInfo[];
  onCancelGeneration: () => void;
  onStartNewBatch: () => void;
}

export const CashGenerationScreen: React.FC<CashGenerationScreenProps> = ({
  progress,
  batchData,
  pdfFiles,
  onCancelGeneration,
  onStartNewBatch,
}) => {
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [zippingLocal, setZippingLocal] = useState(false);
  const [zipProgress, setZipProgress] = useState('');

  const handleDownloadCsv = (): void => {
    if (!batchData || !batchData.selfCheck.passed) return;
    downloadCashManifestCsv(batchData.coupons, 'manifest.csv');
  };

  const handleDownloadSummary = (): void => {
    if (!batchData || !batchData.selfCheck.passed) return;
    downloadCashBatchSummaryJson(
      batchData.summary,
      `batch-summary_${batchData.summary.batch_id}.json`
    );
  };

  const handleDownloadSinglePdf = (fileInfo: CashPdfFileInfo): void => {
    const link = document.createElement('a');
    link.href = fileInfo.url;
    link.setAttribute('download', fileInfo.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadedFiles((previous) => new Set([...previous, fileInfo.fileName]));
  };

  const handleDownloadZip = async (): Promise<void> => {
    if (!batchData || pdfFiles.length === 0 || !batchData.selfCheck.passed) return;
    try {
      setZippingLocal(true);
      setZipProgress('Preparing ZIP archive...');
      const zipBlob = await bundleCashBatchToZip(
        pdfFiles,
        batchData.coupons,
        batchData.summary,
        (_percent, message) => setZipProgress(message)
      );
      downloadZipBlob(zipBlob, `fresh_masala_cash_coupons_${batchData.summary.batch_id}.zip`);
      setZipProgress('');
    } catch (error) {
      console.error(error);
      alert('Failed to package the cash-prize ZIP archive.');
    } finally {
      setZippingLocal(false);
    }
  };

  const filteredPdfFiles = pdfFiles.filter((file) => {
    const haystack = `${file.fileName} ${file.tierAmount} ${file.startIndex}-${file.endIndex}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      {progress.status === 'generating' && (
        <div className="bg-gradient-to-r from-red-950 via-stone-900 to-amber-950 border border-amber-500/50 rounded-2xl p-6 sm:p-8 shadow-festive-glow space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <h3 className="text-xl sm:text-2xl font-black text-white font-festive">
                  Generating Cash Prize Batch...
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 mt-1">
                {progress.currentStep || 'Allocating prize tiers and rendering coupons...'}
              </p>
            </div>
            <button
              onClick={onCancelGeneration}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-rose-300 border border-rose-900/60 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel Generation
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-amber-300 font-mono text-sm">
                Coupon {progress.currentCount.toLocaleString()} of{' '}
                {progress.totalCount.toLocaleString()}
              </span>
              <span className="text-amber-400 font-mono text-base font-black">
                {progress.percent}%
              </span>
            </div>
            <div className="w-full bg-stone-950 h-5 rounded-full overflow-hidden p-0.5 border border-amber-500/30">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 rounded-full transition-all duration-150 ease-out shadow-lg shadow-amber-500/50"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
            <div className="bg-stone-950/70 p-3 rounded-xl border border-stone-800">
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Processed</span>
              <span className="text-base font-bold text-white font-mono">
                {progress.currentCount.toLocaleString()} / {progress.totalCount.toLocaleString()}
              </span>
            </div>
            <div className="bg-stone-950/70 p-3 rounded-xl border border-stone-800">
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Time Elapsed</span>
              <span className="text-base font-bold text-amber-300 font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {progress.elapsedSeconds ?? 0}s
              </span>
            </div>
            <div className="bg-stone-950/70 p-3 rounded-xl border border-stone-800">
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Est. Remaining</span>
              <span className="text-base font-bold text-stone-200 font-mono">
                {progress.estimatedRemainingSeconds
                  ? `~${progress.estimatedRemainingSeconds}s`
                  : 'Calculating...'}
              </span>
            </div>
            <div className="bg-stone-950/70 p-3 rounded-xl border border-stone-800">
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Tier Payout</span>
              <span className="text-xs font-semibold text-emerald-400">
                {batchData ? formatNpr(batchData.summary.total_value) : 'Calculating...'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-amber-200/70 italic text-center">
            Please keep this tab open until the batch and PDFs are complete.
          </p>
        </div>
      )}

      {(progress.status === 'cancelled' || progress.status === 'error') && (
        <div className="bg-stone-900 border border-rose-500/40 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">
                {progress.status === 'cancelled' ? 'Generation Cancelled' : 'Generation Failed'}
              </h3>
              <p className="text-sm text-stone-300">
                {progress.status === 'cancelled'
                  ? 'No files were produced. Your prize setup is intact and you can run the batch again.'
                  : progress.error || 'An unknown error occurred during generation.'}
              </p>
              {progress.status === 'error' && (
                <p className="text-xs text-stone-400">
                  Try reducing the total coupon count or coupons per PDF, then run the batch again.
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onStartNewBatch}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Back to Prize Setup
          </button>
        </div>
      )}

      {progress.status === 'completed' && batchData && (
        <div className="space-y-8">
          <div
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-stone-900 to-amber-950 p-6 sm:p-8 border shadow-xl ${
              batchData.selfCheck.passed ? 'border-emerald-500/40' : 'border-rose-500/50'
            }`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
                    batchData.selfCheck.passed
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {batchData.selfCheck.passed ? (
                    <Sparkles className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {batchData.selfCheck.passed
                    ? 'Cash Prize Batch Verified & Ready'
                    : 'Cash Prize Batch Audit Failed — Do Not Print'}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-festive tracking-wide">
                  Batch {batchData.summary.batch_id}
                </h2>
                <p className="text-stone-300 text-sm max-w-2xl">
                  Generated{' '}
                  <strong className="text-amber-300 font-mono">
                    {batchData.coupons.length.toLocaleString()}
                  </strong>{' '}
                  coupons across <strong className="text-amber-300">{pdfFiles.length}</strong> PDF
                  files. Total payout exposure:{' '}
                  <strong className="text-emerald-400 font-mono">
                    {formatNpr(batchData.summary.total_value)}
                  </strong>
                  .
                </p>
              </div>
              <button
                onClick={onStartNewBatch}
                className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Configure New Cash Batch
              </button>
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Cash Prize Self-Check Audit
              </h3>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                  batchData.selfCheck.passed
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}
              >
                {batchData.selfCheck.passed ? '✓ ALL CHECKS PASSED' : '✕ AUDIT FAILED'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Coupon Count</span>
                <span className="text-emerald-400 font-bold text-sm flex items-center gap-1.5 mt-1">
                  <Check className="w-3.5 h-3.5" />
                  {batchData.selfCheck.totalGenerated.toLocaleString()} /{' '}
                  {batchData.selfCheck.totalRequested.toLocaleString()}
                </span>
              </div>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Code Duplicates</span>
                <span
                  className={`font-bold text-sm flex items-center gap-1.5 mt-1 ${
                    batchData.selfCheck.codeDuplicates === 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {batchData.selfCheck.codeDuplicates === 0 ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {batchData.selfCheck.codeDuplicates} duplicates
                </span>
              </div>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Token Duplicates</span>
                <span
                  className={`font-bold text-sm flex items-center gap-1.5 mt-1 ${
                    batchData.selfCheck.tokenDuplicates === 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {batchData.selfCheck.tokenDuplicates === 0 ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {batchData.selfCheck.tokenDuplicates} duplicates
                </span>
              </div>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">32-Char Tokens</span>
                <span
                  className={`font-bold text-sm flex items-center gap-1.5 mt-1 ${
                    batchData.selfCheck.invalidTokenLengthCount === 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {batchData.selfCheck.invalidTokenLengthCount === 0 ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {batchData.selfCheck.invalidTokenLengthCount === 0 ? '100% valid' : 'Invalid tokens'}
                </span>
              </div>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Tier Counts</span>
                <span
                  className={`font-bold text-sm flex items-center gap-1.5 mt-1 ${
                    batchData.selfCheck.tierCountsMatch ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {batchData.selfCheck.tierCountsMatch ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {batchData.selfCheck.tierCountsMatch ? 'Exact match' : 'Mismatch'}
                </span>
              </div>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Payout Total</span>
                <span
                  className={`font-bold text-sm flex items-center gap-1.5 mt-1 ${
                    batchData.selfCheck.totalValue === batchData.selfCheck.expectedTotalValue
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {batchData.selfCheck.totalValue === batchData.selfCheck.expectedTotalValue ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {formatNpr(batchData.selfCheck.totalValue)}
                </span>
              </div>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Tier Grouping</span>
                <span
                  className={`font-bold text-sm flex items-center gap-1.5 mt-1 ${
                    batchData.selfCheck.groupingValid ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {batchData.selfCheck.groupingValid ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {batchData.selfCheck.groupingValid ? 'Contiguous' : 'Invalid order'}
                </span>
              </div>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Timestamp</span>
                <span
                  className={`font-bold text-sm flex items-center gap-1.5 mt-1 ${
                    batchData.selfCheck.timestampUniform ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {batchData.selfCheck.timestampUniform ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {batchData.selfCheck.timestampUniform ? 'Uniform' : 'Mixed'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-gradient-to-br from-stone-900 to-stone-950 border-2 border-emerald-500/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Import This File
                  </span>
                  <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                </div>
                <h4 className="text-xl font-bold text-white">manifest.csv</h4>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Contains every coupon, secret QR token, batch ID, prize amount, currency, and
                  timestamp. This is the handoff file for the WordPress importer.
                </p>
                <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-800 font-mono text-[10px] text-stone-400 break-all">
                  <span className="text-emerald-400 font-bold">Header: </span>
                  coupon_code,qr_token,batch_id,prize_amount,currency,generated_at
                </div>
              </div>
              <button
                onClick={handleDownloadCsv}
                disabled={!batchData.selfCheck.passed}
                className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-sm transition-all shadow-lg ${
                  batchData.selfCheck.passed
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-stone-950 shadow-emerald-500/20 active:scale-98'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <Download className="w-4 h-4" />
                Download manifest.csv
              </button>
            </div>

            <div className="bg-gradient-to-br from-stone-900 to-stone-950 border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Reconciliation
                  </span>
                  <FileJson className="w-6 h-6 text-amber-400" />
                </div>
                <h4 className="text-xl font-bold text-white">batch-summary.json</h4>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Tier counts, code ranges, and total payout exposure for this batch. Keep it with
                  the manifest for end-of-day reconciliation.
                </p>
                <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
                  <span>Total coupons</span>
                  <strong className="text-amber-300 font-mono">
                    {batchData.summary.total_coupons.toLocaleString()}
                  </strong>
                </div>
              </div>
              <button
                onClick={handleDownloadSummary}
                disabled={!batchData.selfCheck.passed}
                className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-sm transition-all shadow-lg ${
                  batchData.selfCheck.passed
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-stone-950 shadow-amber-500/20 active:scale-98'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <Download className="w-4 h-4" />
                Download summary JSON
              </button>
            </div>

            <div className="bg-gradient-to-br from-stone-900 to-stone-950 border-2 border-red-500/40 rounded-2xl p-6 shadow-2xl flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/40">
                    Print Package
                  </span>
                  <FileArchive className="w-6 h-6 text-red-400" />
                </div>
                <h4 className="text-xl font-bold text-white">Master ZIP</h4>
                <p className="text-xs text-stone-300 leading-relaxed">
                  All tier PDFs, the manifest, the batch summary, and a README in one archive.
                  Tier folders keep the print stacks separate.
                </p>
                <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
                  <span>PDF files</span>
                  <strong className="text-red-300 font-mono">{pdfFiles.length}</strong>
                </div>
              </div>
              <button
                onClick={handleDownloadZip}
                disabled={zippingLocal || !batchData.selfCheck.passed}
                className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-sm transition-all shadow-lg ${
                  batchData.selfCheck.passed
                    ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:brightness-110 text-stone-950 shadow-red-500/20 active:scale-98'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <Download className="w-4 h-4" />
                {zippingLocal ? 'Packaging ZIP...' : 'Download master ZIP'}
              </button>
              {zipProgress && (
                <p className="text-[10px] text-amber-300 font-mono text-center">{zipProgress}</p>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-950 via-rose-950 to-stone-950 border-2 border-red-500 rounded-2xl p-5 sm:p-6 shadow-2xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <div className="space-y-2">
              <h4 className="text-base font-black text-red-200 uppercase tracking-wider">
                Import manifest.csv before distributing any coupon
              </h4>
              <p className="text-sm font-semibold text-rose-100 leading-relaxed">
                The manifest contains the secret token for every coupon. In WordPress, open{' '}
                <strong>Cash Claims → Import</strong>, upload the manifest, and confirm the batch.
                Keep the file private and delete local copies after a successful import.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-rose-300/80 pt-1">
                <span>✓ 32-character Base64URL tokens</span>
                <span>•</span>
                <span>✓ Amounts resolved from the database</span>
                <span>•</span>
                <span>✓ First complete claim locks the coupon</span>
              </div>
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-400" />
                Tier Reconciliation
              </h3>
              <span className="text-[10px] font-mono text-stone-400">
                {formatNpr(batchData.summary.total_value)} total payout
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-stone-400 border-b border-stone-800">
                    <th className="py-2 pr-3 font-bold uppercase tracking-wider text-[10px]">Prize</th>
                    <th className="py-2 pr-3 font-bold uppercase tracking-wider text-[10px]">Coupons</th>
                    <th className="py-2 pr-3 font-bold uppercase tracking-wider text-[10px]">Code Range</th>
                    <th className="py-2 text-right font-bold uppercase tracking-wider text-[10px]">Tier Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {batchData.summary.tiers.map((tier) => (
                    <tr key={tier.amount} className="border-b border-stone-800/60 last:border-0">
                      <td className="py-2.5 pr-3 font-bold text-amber-300 font-mono">
                        {formatNpr(tier.amount)}
                      </td>
                      <td className="py-2.5 pr-3 text-stone-200 font-mono">
                        {tier.quantity.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 text-stone-400 font-mono text-[11px]">
                        {tier.codeStart} → {tier.codeEnd}
                      </td>
                      <td className="py-2.5 text-right text-emerald-400 font-mono">
                        {formatNpr(tier.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Individual PDF Print Batches ({pdfFiles.length} files)
                </h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Grouped by prize tier for clean printing and distribution.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  placeholder="Filter by tier, file, or sequence..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full bg-stone-950 pl-8 pr-3 py-1.5 rounded-lg border border-stone-800 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
              {filteredPdfFiles.length === 0 && (
                <p className="text-xs text-stone-400 sm:col-span-2 lg:col-span-3 py-6 text-center">
                  No PDFs match “{searchTerm}”.
                </p>
              )}
              {filteredPdfFiles.map((fileInfo) => {
                const isDownloaded = downloadedFiles.has(fileInfo.fileName);
                return (
                  <div
                    key={fileInfo.fileName}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      isDownloaded
                        ? 'bg-stone-950/60 border-emerald-500/30'
                        : 'bg-stone-950 border-stone-800 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                          {formatNpr(fileInfo.tierAmount)}
                        </span>
                        {isDownloaded && (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Downloaded
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] font-bold text-stone-200 break-all">
                        {fileInfo.fileName}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-stone-400">
                        <span>
                          Cards:{' '}
                          <strong className="text-stone-200 font-mono">
                            #{fileInfo.startIndex} - #{fileInfo.endIndex}
                          </strong>
                        </span>
                        <span>
                          {fileInfo.pageCount} A4 {fileInfo.pageCount === 1 ? 'page' : 'pages'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadSinglePdf(fileInfo)}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                        isDownloaded
                          ? 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                          : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
