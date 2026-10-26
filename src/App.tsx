import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { ConfigScreen } from './components/ConfigScreen';
import { PreviewScreen } from './components/PreviewScreen';
import { GenerationScreen } from './components/GenerationScreen';
import type {
  CouponConfig,
  CouponItem,
  GeneratedBatchData,
  GeneratedPdfFileInfo,
  GenerationProgress,
  ValidationErrors,
  CouponLayoutConfig,
} from './types/coupon';
import { DEFAULT_LAYOUT_CONFIG } from './types/coupon';
import { DEFAULT_LOGO_DATA_URL } from './utils/defaultLogo';
import { generateLinktreeQr, generateVerificationQr } from './utils/qr';
import { generateUniqueToken, performSelfCheck } from './utils/security';
import { generateAllPdfFiles } from './utils/pdf';

const DEFAULT_CONFIG: CouponConfig = {
  logoDataUrl: DEFAULT_LOGO_DATA_URL,
  phoneNumber: '+977-9801234567',
  landlineNumber: '01-5912345',
  linktreeUrl: 'https://linktr.ee/freshmasala',
  verificationBaseUrl: 'https://freshmasala.com.np/verify/',
  couponPrefix: 'FM-',
  startingNumber: 1,
  totalQuantity: 5000,
  batchId: 'BATCH-2026-01',
  couponsPerPdf: 250,
  layout: DEFAULT_LAYOUT_CONFIG,
};

export const App: React.FC = () => {
  // Screen state: 'config' | 'preview' | 'generation'
  const [currentScreen, setCurrentScreen] = useState<'config' | 'preview' | 'generation'>('config');

  // Configuration state
  const [config, setConfig] = useState<CouponConfig>(DEFAULT_CONFIG);

  // Cached Preview QR codes
  const [linktreeQrUrl, setLinktreeQrUrl] = useState<string>('');
  const [sampleVerificationQrUrl, setSampleVerificationQrUrl] = useState<string>('');

  // Generation execution state
  const [progress, setProgress] = useState<GenerationProgress>({
    status: 'idle',
    currentCount: 0,
    totalCount: 0,
    currentStep: '',
    percent: 0,
  });
  const [batchData, setBatchData] = useState<GeneratedBatchData | null>(null);
  const [pdfFiles, setPdfFiles] = useState<GeneratedPdfFileInfo[]>([]);

  const cancellationRef = useRef(false);

  // Real-time Field Validation
  const validateConfig = useCallback((cfg: CouponConfig): { isValid: boolean; errs: ValidationErrors } => {
    const errs: ValidationErrors = {};

    if (!cfg.logoDataUrl) {
      errs.logoDataUrl = 'Logo image is required.';
    }

    if (!cfg.phoneNumber.trim()) {
      errs.phoneNumber = 'Business phone number is required.';
    }

    if (!cfg.linktreeUrl.trim()) {
      errs.linktreeUrl = 'Linktree URL is required.';
    } else if (!/^https?:\/\//i.test(cfg.linktreeUrl.trim())) {
      errs.linktreeUrl = 'Must be a valid URL starting with http:// or https://';
    }

    if (!cfg.verificationBaseUrl.trim()) {
      errs.verificationBaseUrl = 'Verification base URL is required.';
    } else if (!/^https?:\/\//i.test(cfg.verificationBaseUrl.trim())) {
      errs.verificationBaseUrl = 'Must be a valid URL starting with http:// or https://';
    }

    if (!cfg.couponPrefix.trim()) {
      errs.couponPrefix = 'Coupon code prefix is required (e.g. FM-).';
    }

    if (!cfg.startingNumber || cfg.startingNumber < 1) {
      errs.startingNumber = 'Starting sequence number must be 1 or greater.';
    }

    if (!cfg.totalQuantity || cfg.totalQuantity < 1) {
      errs.totalQuantity = 'Total quantity must be at least 1.';
    } else if (cfg.totalQuantity > 20000) {
      errs.totalQuantity = 'Maximum allowed quantity is 20,000 coupons per run.';
    }

    if (!cfg.batchId.trim()) {
      errs.batchId = 'Batch ID identifier is required (e.g. BATCH-2026-01).';
    }

    return {
      isValid: Object.keys(errs).length === 0,
      errs,
    };
  }, []);

  // Validation is derived from config so it can never drift out of sync.
  const validation = useMemo(() => validateConfig(config), [config, validateConfig]);
  const errors: ValidationErrors = validation.errs;
  const isValid = validation.isValid;

  // Update config helper
  const handleConfigChange = (updated: Partial<CouponConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  };

  // Layout customizer handlers
  const handleLayoutChange = (newLayout: CouponLayoutConfig) => {
    setConfig((prev) => ({ ...prev, layout: newLayout }));
  };

  const handleResetLayout = () => {
    setConfig((prev) => ({ ...prev, layout: DEFAULT_LAYOUT_CONFIG }));
  };

  // Update Preview QR codes whenever Linktree URL or Verification URL change
  useEffect(() => {
    let active = true;
    async function updatePreviewQrs() {
      try {
        if (config.linktreeUrl) {
          const lQr = await generateLinktreeQr(config.linktreeUrl);
          if (active) setLinktreeQrUrl(lQr);
        }
        if (config.verificationBaseUrl) {
          const vQr = await generateVerificationQr(
            config.verificationBaseUrl,
            'k7Qm2xR9vB4nL8pT6wY3zH5dF1sJ0aCe'
          );
          if (active) setSampleVerificationQrUrl(vQr);
        }
      } catch (err) {
        console.error('Error rendering sample QR codes:', err);
      }
    }
    updatePreviewQrs();
    return () => {
      active = false;
    };
  }, [config.linktreeUrl, config.verificationBaseUrl]);

  // Beforeunload listener during active generation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (progress.status === 'generating') {
        e.preventDefault();
        e.returnValue = 'A coupon batch generation is currently in progress. If you leave or reload now, all progress will be lost.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [progress.status]);

  // Start Batch Generation
  const handleStartGeneration = async () => {
    if (!isValid) return;

    cancellationRef.current = false;
    setCurrentScreen('generation');

    const total = config.totalQuantity;
    const startTime = Date.now();

    setProgress({
      status: 'generating',
      currentCount: 0,
      totalCount: total,
      currentStep: 'Initializing secure random token pool...',
      percent: 0,
      startTime,
      elapsedSeconds: 0,
    });

    try {
      // 1. Generate Static Linktree QR once
      const linkQrDataUrl = await generateLinktreeQr(config.linktreeUrl);

      // 2. Generate Uniform UTC ISO timestamp for ALL rows
      const uniformGeneratedAt = new Date().toISOString();

      // 3. Generate Cryptographically Secure Coupons with Zero Duplicate Guarantee
      const existingTokens = new Set<string>();
      const generatedCoupons: CouponItem[] = [];

      const startSeq = config.startingNumber;

      for (let i = 0; i < total; i++) {
        if (cancellationRef.current) {
          throw new Error('Generation cancelled by user');
        }

        const couponCode = `${config.couponPrefix}${String(startSeq + i).padStart(5, '0')}`;
        const qrToken = generateUniqueToken(existingTokens);

        generatedCoupons.push({
          coupon_code: couponCode,
          qr_token: qrToken,
          batch_id: config.batchId,
          generated_at: uniformGeneratedAt,
        });

        // Periodic yield during token generation
        if (i % 500 === 0 && i > 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      // 4. Perform Rigorous Self-Check
      const selfCheck = performSelfCheck(generatedCoupons, total);
      if (!selfCheck.passed) {
        throw new Error('Pre-export self check failed: token collision or invalid format detected.');
      }

      // 5. Generate Multi-Page Print-Ready PDFs with chunked progress
      const pdfResults = await generateAllPdfFiles(
        config,
        generatedCoupons,
        linkQrDataUrl,
        (current, totalCount, msg) => {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          const pct = Math.min(Math.round((current / totalCount) * 100), 99);
          const speed = current > 0 ? current / Math.max(elapsed, 0.5) : 1;
          const remaining = Math.max(0, Math.round((totalCount - current) / speed));

          setProgress((prev) => ({
            ...prev,
            currentCount: current,
            totalCount,
            currentStep: msg,
            percent: pct,
            elapsedSeconds: elapsed,
            estimatedRemainingSeconds: remaining,
          }));
        },
        () => cancellationRef.current
      );

      const completedBatch: GeneratedBatchData = {
        config,
        coupons: generatedCoupons,
        generatedAt: uniformGeneratedAt,
        linktreeQrDataUrl: linkQrDataUrl,
        selfCheck,
      };

      setBatchData(completedBatch);
      setPdfFiles(pdfResults);

      setProgress({
        status: 'completed',
        currentCount: total,
        totalCount: total,
        currentStep: 'Batch completed and verified!',
        percent: 100,
        elapsedSeconds: Math.round((Date.now() - startTime) / 1000),
      });

      // Trigger celebration confetti
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#dc2626', '#10b981', '#fbbf24', '#ffffff'],
      });

    } catch (err: any) {
      if (err?.message === 'Generation cancelled by user') {
        setProgress({
          status: 'cancelled',
          currentCount: 0,
          totalCount: total,
          currentStep: 'Generation cancelled',
          percent: 0,
        });
      } else {
        console.error('Generation failure:', err);
        setProgress({
          status: 'error',
          currentCount: 0,
          totalCount: total,
          currentStep: 'Generation failed',
          percent: 0,
          error: err?.message || 'An unknown error occurred during generation.',
        });
        alert(`Generation Error: ${err?.message || 'Unknown error'}`);
      }
    }
  };

  const handleCancelGeneration = () => {
    cancellationRef.current = true;
  };

  const handleStartNewBatch = () => {
    setBatchData(null);
    setPdfFiles([]);
    setProgress({
      status: 'idle',
      currentCount: 0,
      totalCount: 0,
      currentStep: '',
      percent: 0,
    });
    setCurrentScreen('config');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-900">
      {/* App Header & Navigation */}
      <Header
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          if (progress.status === 'generating') {
            if (!confirm('Generation is currently active. Are you sure you want to navigate away?')) {
              return;
            }
            cancellationRef.current = true;
          }
          setCurrentScreen(screen);
        }}
        hasGenerated={progress.status === 'completed' && batchData !== null}
      />

      {/* Main Screen Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full">
        {currentScreen === 'config' && (
          <ConfigScreen
            config={config}
            onChange={handleConfigChange}
            errors={errors}
            isValid={isValid}
            onProceedToPreview={() => setCurrentScreen('preview')}
            onDirectGenerate={handleStartGeneration}
          />
        )}

        {currentScreen === 'preview' && (
          <PreviewScreen
            config={config}
            linktreeQrUrl={linktreeQrUrl}
            sampleVerificationQrUrl={sampleVerificationQrUrl}
            onChangeLayout={handleLayoutChange}
            onResetLayout={handleResetLayout}
            onBackToConfig={() => setCurrentScreen('config')}
            onStartGeneration={handleStartGeneration}
          />
        )}

        {currentScreen === 'generation' && (
          <GenerationScreen
            config={config}
            progress={progress}
            batchData={batchData}
            pdfFiles={pdfFiles}
            onCancelGeneration={handleCancelGeneration}
            onStartNewBatch={handleStartNewBatch}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800/80 bg-stone-950 py-5 text-center text-xs text-stone-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Fresh Masala. All rights reserved. Promotional Giveaway Operations Engine.</p>
          <p className="text-stone-400 text-[11px]">
            Engineered for high-volume client-side PDF &amp; CSV generation.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
