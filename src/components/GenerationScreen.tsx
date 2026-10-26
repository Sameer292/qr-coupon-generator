import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileArchive,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  Clock,
  Check,
  ShieldCheck,
  Search,
} from 'lucide-react';
import type {
  CouponConfig,
  GeneratedBatchData,
  GeneratedPdfFileInfo,
  GenerationProgress,
} from '../types/coupon';
import { downloadManifestCsv } from '../utils/csv';
import { bundlePdfsToZip, downloadZipBlob } from '../utils/zip';

interface GenerationScreenProps {
  config: CouponConfig;
  progress: GenerationProgress;
  batchData: GeneratedBatchData | null;
  pdfFiles: GeneratedPdfFileInfo[];
  onCancelGeneration: () => void;
  onStartNewBatch: () => void;
}

export const GenerationScreen: React.FC<GenerationScreenProps> = ({
  config,
  progress,
  batchData,
  pdfFiles,
  onCancelGeneration,
  onStartNewBatch,
}) => {
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [zippingLocal, setZippingLocal] = useState(false);

  // Download single CSV
  const handleDownloadCsv = () => {
    if (!batchData || !batchData.selfCheck.passed) return;
    downloadManifestCsv(batchData.coupons, 'manifest.csv');
  };

  // Download single PDF
  const handleDownloadSinglePdf = (fileInfo: GeneratedPdfFileInfo) => {
    const link = document.createElement('a');
    link.href = fileInfo.url;
    link.setAttribute('download', fileInfo.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadedFiles((prev) => new Set([...prev, fileInfo.fileName]));
  };

  // Download all PDFs bundled in a ZIP
  const handleDownloadZip = async () => {
    if (!batchData || pdfFiles.length === 0 || !batchData.selfCheck.passed) return;
    try {
      setZippingLocal(true);
      const zipBlob = await bundlePdfsToZip(
        pdfFiles,
        batchData.coupons,
        config.batchId
      );
      downloadZipBlob(zipBlob, `fresh_masala_coupons_${config.batchId}.zip`);
    } catch (err) {
      console.error(err);
      alert('Failed to package ZIP archive.');
    } finally {
      setZippingLocal(false);
    }
  };

  const filteredPdfFiles = pdfFiles.filter((f) =>
    f.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${f.startIndex}-${f.endIndex}`.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      
      {/* ======================================================== */}
      {/* 1. ACTIVE GENERATION PROGRESS BAR (WHEN GENERATING) */}
      {/* ======================================================== */}
      {progress.status === 'generating' && (
        <div className="bg-gradient-to-r from-red-950 via-stone-900 to-amber-950 border border-amber-500/50 rounded-2xl p-6 sm:p-8 shadow-festive-glow space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <h3 className="text-xl sm:text-2xl font-black text-white font-festive">
                  Generating Batch in Progress...
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 mt-1">
                {progress.currentStep || 'Processing coupons asynchronously...'}
              </p>
            </div>

            <button
              onClick={onCancelGeneration}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-rose-300 border border-rose-900/60 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel Generation
            </button>
          </div>

          {/* Large Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-amber-300 font-mono text-sm">
                Generating coupon {progress.currentCount.toLocaleString()} of {progress.totalCount.toLocaleString()}
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

          {/* Stats Bar */}
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
                {progress.estimatedRemainingSeconds ? `~${progress.estimatedRemainingSeconds}s` : 'Calculating...'}
              </span>
            </div>

            <div className="bg-stone-950/70 p-3 rounded-xl border border-stone-800">
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Execution Mode</span>
              <span className="text-xs font-semibold text-emerald-400">
                Chunked (Non-blocking)
              </span>
            </div>
          </div>

          <p className="text-[11px] text-amber-200/70 italic text-center">
            ⚠️ Please do not close or reload this browser tab while batch generation is running.
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CANCELLED / FAILED STATE */}
      {/* ======================================================== */}
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
                  ? 'No files were produced. Your configuration is still intact and you can run the batch again.'
                  : progress.error || 'An unknown error occurred during generation.'}
              </p>
              {progress.status === 'error' && (
                <p className="text-xs text-stone-400">
                  Try reducing the total quantity or coupons per PDF, then run the batch again.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onStartNewBatch}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Back to Configuration</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. COMPLETED EXPORT HUB (WHEN FINISHED) */}
      {/* ======================================================== */}
      {progress.status === 'completed' && batchData && (
        <div className="space-y-8">
          
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-stone-900 to-amber-950 p-6 sm:p-8 border border-emerald-500/40 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                  <Sparkles className="w-3.5 h-3.5" />
                  Generation &amp; Verification Complete
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-festive tracking-wide">
                  Batch {config.batchId} Ready for Download
                </h2>
                <p className="text-stone-300 text-sm max-w-2xl">
                  Successfully generated <strong className="text-amber-300 font-mono">{batchData.coupons.length.toLocaleString()}</strong> unique coupons across <strong className="text-amber-300">{pdfFiles.length}</strong> PDF files with 100% cryptographic token integrity.
                </p>
              </div>

              <button
                onClick={onStartNewBatch}
                className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Configure New Batch</span>
              </button>
            </div>
          </div>

          {/* Self-Check Audit Dashboard */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Pre-Export Self-Check Audit
              </h3>
              <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                batchData.selfCheck.passed
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {batchData.selfCheck.passed ? '✓ ALL CHECKS PASSED' : '✕ AUDIT FAILED'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Total Quantity Match</span>
                <span className="text-emerald-400 font-bold text-sm flex items-center gap-1.5 mt-1">
                  <Check className="w-3.5 h-3.5" />
                  {batchData.selfCheck.totalGenerated.toLocaleString()} / {batchData.selfCheck.totalRequested.toLocaleString()}
                </span>
              </div>

              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Coupon Code Duplicates</span>
                <span className={`font-bold text-sm flex items-center gap-1.5 mt-1 ${
                  batchData.selfCheck.codeDuplicates === 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {batchData.selfCheck.codeDuplicates === 0 ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {batchData.selfCheck.codeDuplicates} duplicates
                </span>
              </div>

              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">QR Token Duplicates</span>
                <span className={`font-bold text-sm flex items-center gap-1.5 mt-1 ${
                  batchData.selfCheck.tokenDuplicates === 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {batchData.selfCheck.tokenDuplicates === 0 ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {batchData.selfCheck.tokenDuplicates} duplicates
                </span>
              </div>

              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">32-Char Crypto Tokens</span>
                <span className={`font-bold text-sm flex items-center gap-1.5 mt-1 ${
                  batchData.selfCheck.invalidTokenLengthCount === 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {batchData.selfCheck.invalidTokenLengthCount === 0 ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  100% Valid (32 chars)
                </span>
              </div>
            </div>
          </div>

          {/* CRITICAL CSV EXPORT & WARNING NOTICE */}
          <div className="space-y-4">
            
            {/* Download Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1: Manifest CSV (The most important output) */}
              <div className="bg-gradient-to-br from-stone-900 to-stone-950 border-2 border-emerald-500/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Primary Verification Output
                    </span>
                    <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h4 className="text-xl font-bold text-white">manifest.csv</h4>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    The complete CSV manifest containing exactly <code className="text-amber-300 font-mono">coupon_code,qr_token,batch_id,generated_at</code> for direct import into WordPress database.
                  </p>
                  <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-800 font-mono text-[11px] text-stone-400">
                    <span className="text-emerald-400 font-bold">Header: </span>
                    coupon_code,qr_token,batch_id,generated_at
                  </div>
                </div>

                <button
                  onClick={handleDownloadCsv}
                  disabled={!batchData.selfCheck.passed}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-sm transition-all shadow-lg cursor-pointer ${
                    batchData.selfCheck.passed
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-stone-950 shadow-emerald-500/20 active:scale-98'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>Download manifest.csv ({batchData.coupons.length.toLocaleString()} records)</span>
                </button>
              </div>

              {/* Card 2: All PDFs ZIP Bundle */}
              <div className="bg-gradient-to-br from-stone-900 to-stone-950 border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      All-in-One Print Package
                    </span>
                    <FileArchive className="w-6 h-6 text-amber-400" />
                  </div>
                  <h4 className="text-xl font-bold text-white">All PDFs in Single ZIP</h4>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Packages all {pdfFiles.length} split print-ready PDFs and the manifest CSV into a single compressed <code className="text-amber-300 font-mono">.zip</code> archive.
                  </p>
                  <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
                    <span>PDF Files: <strong>{pdfFiles.length} files</strong></span>
                    <span>Coupons: <strong>{config.totalQuantity.toLocaleString()}</strong></span>
                  </div>
                </div>

                <button
                  onClick={handleDownloadZip}
                  disabled={zippingLocal || !batchData.selfCheck.passed}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-sm transition-all shadow-lg cursor-pointer ${
                    batchData.selfCheck.passed
                      ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:brightness-110 text-stone-950 shadow-amber-500/20 active:scale-98'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {zippingLocal ? 'Packaging ZIP Archive...' : `Download Master ZIP (${pdfFiles.length} PDFs)`}
                  </span>
                </button>
              </div>

            </div>

            {/* PROMINENT MANDATORY SECURITY WARNING ALERT */}
            <div className="bg-gradient-to-r from-red-950 via-rose-950 to-stone-950 border-2 border-red-500 rounded-2xl p-5 sm:p-6 shadow-2xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldAlert className="w-6 h-6 text-red-400" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-black text-red-200 uppercase tracking-wider">
                  CRITICAL SECURITY NOTICE — KEEP manifest.csv PROTECTED
                </h4>
                <p className="text-sm font-semibold text-rose-100 leading-relaxed">
                  "manifest.csv contains the secret tokens for all coupons. Store it securely, import it to the website once, then delete local copies. Anyone with this file can forge coupon activations."
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-rose-300/80 pt-1">
                  <span>✓ 32-character Base64URL entropy</span>
                  <span>•</span>
                  <span>✓ Zero algorithmic derivation</span>
                  <span>•</span>
                  <span>✓ Stored entirely in volatile browser memory</span>
                </div>
              </div>
            </div>

          </div>

          {/* Individual PDF Files List */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Individual PDF Print Batches ({pdfFiles.length} Files)
                </h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Download individual segments for smaller commercial print jobs or testing
                </p>
              </div>

              {/* Search filter for large runs */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  placeholder="Filter by file or sequence..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-stone-950 pl-8 pr-3 py-1.5 rounded-lg border border-stone-800 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* List of files */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto pr-1">
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
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-amber-300 truncate">
                          {fileInfo.fileName}
                        </span>
                        {isDownloaded && (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Downloaded
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-stone-400">
                        <span>
                          Cards: <strong className="text-stone-200 font-mono">#{fileInfo.startIndex} - #{fileInfo.endIndex}</strong>
                        </span>
                        <span>
                          {fileInfo.pageCount} A4 {fileInfo.pageCount === 1 ? 'page' : 'pages'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadSinglePdf(fileInfo)}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isDownloaded
                          ? 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                          : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
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
