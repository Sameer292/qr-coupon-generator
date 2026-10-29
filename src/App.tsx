import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { ConfigScreen } from './components/ConfigScreen';
import { PreviewScreen } from './components/PreviewScreen';
import { GenerationScreen } from './components/GenerationScreen';
import { CashConfigScreen } from './components/CashConfigScreen';
import { CashPreviewScreen } from './components/CashPreviewScreen';
import { CashGenerationScreen } from './components/CashGenerationScreen';
import type {
  CampaignMode,
  CashCouponConfig,
  CashGeneratedBatchData,
  CashPdfFileInfo,
  CouponConfig,
  CouponItem,
  CouponLayoutConfig,
  GeneratedBatchData,
  GeneratedPdfFileInfo,
  GenerationProgress,
  ValidationErrors,
} from './types/coupon';
import { DEFAULT_LAYOUT_CONFIG } from './types/coupon';
import { DEFAULT_LOGO_DATA_URL } from './utils/defaultLogo';
import { generateLinktreeQr, generateVerificationQr } from './utils/qr';
import { generateUniqueToken, performSelfCheck } from './utils/security';
import { generateAllPdfFiles } from './utils/pdf';
import { validateCashConfig } from './utils/cashValidation';
import {
  buildCashBatchSummary,
  buildCashCoupons,
  getTotalPrizeQuantity,
  performCashSelfCheck,
} from './utils/prizeAllocation';
import { generateCashPdfFiles } from './utils/cashPdf';

type Screen = 'config' | 'preview' | 'generation';

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

const DEFAULT_CASH_CONFIG: CashCouponConfig = {
  logoDataUrl: DEFAULT_LOGO_DATA_URL,
  phoneNumber: '+977-9801234567',
  landlineNumber: '01-5912345',
  linktreeUrl: 'https://linktr.ee/freshmasala',
  claimBaseUrl: 'https://freshmasala.com.np/claim/',
  couponPrefix: 'FM-',
  startingNumber: 1,
  batchId: `CASH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
  couponsPerPdf: 50,
  prizeTiers: [
    { id: 'tier-100', amount: 100, quantity: 100 },
    { id: 'tier-500', amount: 500, quantity: 20 },
    { id: 'tier-1000', amount: 1000, quantity: 5 },
  ],
  includeLinktreeQr: false,
};

const IDLE_PROGRESS: GenerationProgress = {
  status: 'idle',
  currentCount: 0,
  totalCount: 0,
  currentStep: '',
  percent: 0,
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return 'An unknown error occurred during generation.';
};

const revokePdfUrls = (files: GeneratedPdfFileInfo[]): void => {
  files.forEach((file) => URL.revokeObjectURL(file.url));
};

const revokeCashPdfUrls = (files: CashPdfFileInfo[]): void => {
  files.forEach((file) => URL.revokeObjectURL(file.url));
};

export const App: React.FC = () => {
  const [campaignMode, setCampaignMode] = useState<CampaignMode>('draw');
  const [currentScreen, setCurrentScreen] = useState<Screen>('config');

  // Weekly draw configuration and outputs
  const [config, setConfig] = useState<CouponConfig>(DEFAULT_CONFIG);
  const [linktreeQrUrl, setLinktreeQrUrl] = useState<string>('');
  const [sampleVerificationQrUrl, setSampleVerificationQrUrl] = useState<string>('');
  const [progress, setProgress] = useState<GenerationProgress>(IDLE_PROGRESS);
  const [batchData, setBatchData] = useState<GeneratedBatchData | null>(null);
  const [pdfFiles, setPdfFiles] = useState<GeneratedPdfFileInfo[]>([]);
  const cancellationRef = useRef(false);

  // Cash prize configuration and outputs
  const [cashConfig, setCashConfig] = useState<CashCouponConfig>(DEFAULT_CASH_CONFIG);
  const [cashProgress, setCashProgress] = useState<GenerationProgress>(IDLE_PROGRESS);
  const [cashBatchData, setCashBatchData] = useState<CashGeneratedBatchData | null>(null);
  const [cashPdfFiles, setCashPdfFiles] = useState<CashPdfFileInfo[]>([]);
  const cashCancellationRef = useRef(false);

  const validateConfig = useCallback(
    (cfg: CouponConfig): { isValid: boolean; errs: ValidationErrors } => {
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
    },
    []
  );

  const validation = useMemo(() => validateConfig(config), [config, validateConfig]);
  const errors: ValidationErrors = validation.errs;
  const isValid = validation.isValid;

  const cashValidation = useMemo(() => validateCashConfig(cashConfig), [cashConfig]);
  const cashErrors = cashValidation.errs;
  const isCashValid = cashValidation.isValid;

  const handleConfigChange = (updated: Partial<CouponConfig>): void => {
    setConfig((previous) => ({ ...previous, ...updated }));
  };

  const handleCashConfigChange = (updated: Partial<CashCouponConfig>): void => {
    setCashConfig((previous) => ({ ...previous, ...updated }));
  };

  const handleLayoutChange = (newLayout: CouponLayoutConfig): void => {
    setConfig((previous) => ({ ...previous, layout: newLayout }));
  };

  const handleResetLayout = (): void => {
    setConfig((previous) => ({ ...previous, layout: DEFAULT_LAYOUT_CONFIG }));
  };

  useEffect(() => {
    let active = true;

    const updatePreviewQrs = async (): Promise<void> => {
      try {
        if (config.linktreeUrl) {
          const linktreeQr = await generateLinktreeQr(config.linktreeUrl);
          if (active) setLinktreeQrUrl(linktreeQr);
        }
        if (config.verificationBaseUrl) {
          const verificationQr = await generateVerificationQr(
            config.verificationBaseUrl,
            'k7Qm2xR9vB4nL8pT6wY3zH5dF1sJ0aCe'
          );
          if (active) setSampleVerificationQrUrl(verificationQr);
        }
      } catch (error) {
        console.error('Error rendering sample QR codes:', error);
      }
    };

    if (campaignMode === 'draw') {
      void updatePreviewQrs();
    }

    return () => {
      active = false;
    };
  }, [campaignMode, config.linktreeUrl, config.verificationBaseUrl]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      const drawRunning = progress.status === 'generating';
      const cashRunning = cashProgress.status === 'generating';
      if (drawRunning || cashRunning) {
        event.preventDefault();
        event.returnValue =
          'A coupon batch generation is currently in progress. If you leave or reload now, all progress will be lost.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [progress.status, cashProgress.status]);

  const handleCampaignModeChange = (mode: CampaignMode): void => {
    if (mode === campaignMode) return;

    const drawRunning = progress.status === 'generating';
    const cashRunning = cashProgress.status === 'generating';
    if (drawRunning || cashRunning) {
      if (!confirm('A generation is currently active. Switch campaign mode and cancel it?')) {
        return;
      }
      cancellationRef.current = true;
      cashCancellationRef.current = true;
    }

    setCampaignMode(mode);
    setCurrentScreen('config');
  };

  const handleNavigate = (screen: Screen): void => {
    const activeRunning =
      campaignMode === 'cash' ? cashProgress.status === 'generating' : progress.status === 'generating';

    if (activeRunning) {
      if (!confirm('Generation is currently active. Are you sure you want to navigate away?')) {
        return;
      }
      if (campaignMode === 'cash') {
        cashCancellationRef.current = true;
      } else {
        cancellationRef.current = true;
      }
    }

    setCurrentScreen(screen);
  };

  const handleStartGeneration = async (): Promise<void> => {
    if (!isValid) return;

    cancellationRef.current = false;
    setCurrentScreen('generation');
    setBatchData(null);
    revokePdfUrls(pdfFiles);
    setPdfFiles([]);

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

    let generatedPdfResults: GeneratedPdfFileInfo[] = [];
    try {
      const linkQrDataUrl = await generateLinktreeQr(config.linktreeUrl);
      const uniformGeneratedAt = new Date().toISOString();
      const existingTokens = new Set<string>();
      const generatedCoupons: CouponItem[] = [];
      const startSeq = config.startingNumber;

      for (let index = 0; index < total; index++) {
        if (cancellationRef.current) {
          throw new Error('Generation cancelled by user');
        }

        const couponCode = `${config.couponPrefix}${String(startSeq + index).padStart(5, '0')}`;
        const qrToken = generateUniqueToken(existingTokens);

        generatedCoupons.push({
          coupon_code: couponCode,
          qr_token: qrToken,
          batch_id: config.batchId,
          generated_at: uniformGeneratedAt,
        });

        if (index % 500 === 0 && index > 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      const selfCheck = performSelfCheck(generatedCoupons, total);
      if (!selfCheck.passed) {
        throw new Error('Pre-export self check failed: token collision or invalid format detected.');
      }

      const pdfResults = await generateAllPdfFiles(
        config,
        generatedCoupons,
        linkQrDataUrl,
        (current, totalCount, message) => {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          const percent = Math.min(Math.round((current / totalCount) * 100), 99);
          const speed = current > 0 ? current / Math.max(elapsed, 0.5) : 1;
          const remaining = Math.max(0, Math.round((totalCount - current) / speed));

          setProgress((previous) => ({
            ...previous,
            currentCount: current,
            totalCount,
            currentStep: message,
            percent,
            elapsedSeconds: elapsed,
            estimatedRemainingSeconds: remaining,
          }));
        },
        () => cancellationRef.current
      );
      generatedPdfResults = pdfResults;

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

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#dc2626', '#10b981', '#fbbf24', '#ffffff'],
      });
    } catch (error) {
      revokePdfUrls(generatedPdfResults);
      const message = getErrorMessage(error);
      if (message === 'Generation cancelled by user') {
        setProgress({
          status: 'cancelled',
          currentCount: 0,
          totalCount: total,
          currentStep: 'Generation cancelled',
          percent: 0,
        });
      } else {
        console.error('Generation failure:', error);
        setProgress({
          status: 'error',
          currentCount: 0,
          totalCount: total,
          currentStep: 'Generation failed',
          percent: 0,
          error: message,
        });
        alert(`Generation Error: ${message}`);
      }
    }
  };

  const handleStartCashGeneration = async (): Promise<void> => {
    if (!isCashValid) return;

    cashCancellationRef.current = false;
    setCurrentScreen('generation');
    setCashBatchData(null);
    revokeCashPdfUrls(cashPdfFiles);
    setCashPdfFiles([]);

    const total = getTotalPrizeQuantity(cashConfig.prizeTiers);
    const startTime = Date.now();

    setCashProgress({
      status: 'generating',
      currentCount: 0,
      totalCount: total,
      currentStep: 'Preparing prize tier allocation...',
      percent: 0,
      startTime,
      elapsedSeconds: 0,
    });

    let generatedPdfResults: CashPdfFileInfo[] = [];
    try {
      const linktreeQrDataUrl = cashConfig.includeLinktreeQr
        ? await generateLinktreeQr(cashConfig.linktreeUrl)
        : '';

      const generatedCoupons = buildCashCoupons(
        cashConfig,
        (current, totalCount, message) => {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          const percent = Math.min(Math.round((current / totalCount) * 100), 99);
          const speed = current > 0 ? current / Math.max(elapsed, 0.5) : 1;
          const remaining = Math.max(0, Math.round((totalCount - current) / speed));
          setCashProgress((previous) => ({
            ...previous,
            currentCount: current,
            totalCount,
            currentStep: message,
            percent,
            elapsedSeconds: elapsed,
            estimatedRemainingSeconds: remaining,
          }));
        },
        () => cashCancellationRef.current
      );

      const generatedAt = generatedCoupons[0]?.generated_at || new Date().toISOString();
      const selfCheck = performCashSelfCheck(generatedCoupons, total, cashConfig.prizeTiers);
      if (!selfCheck.passed) {
        throw new Error(
          'Cash-prize self check failed: tier count, token, or payout total mismatch detected.'
        );
      }

      const summary = buildCashBatchSummary(cashConfig, generatedCoupons, generatedAt);

      const pdfResults = await generateCashPdfFiles(
        cashConfig,
        generatedCoupons,
        linktreeQrDataUrl,
        (current, totalCount, message) => {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          const percent = Math.min(Math.round((current / totalCount) * 100), 99);
          const speed = current > 0 ? current / Math.max(elapsed, 0.5) : 1;
          const remaining = Math.max(0, Math.round((totalCount - current) / speed));
          setCashProgress((previous) => ({
            ...previous,
            currentCount: current,
            totalCount,
            currentStep: message,
            percent,
            elapsedSeconds: elapsed,
            estimatedRemainingSeconds: remaining,
          }));
        },
        () => cashCancellationRef.current
      );
      generatedPdfResults = pdfResults;

      const completedBatch: CashGeneratedBatchData = {
        config: cashConfig,
        coupons: generatedCoupons,
        generatedAt,
        linktreeQrDataUrl,
        selfCheck,
        summary,
      };

      setCashBatchData(completedBatch);
      setCashPdfFiles(pdfResults);
      setCashProgress({
        status: 'completed',
        currentCount: total,
        totalCount: total,
        currentStep: 'Cash-prize batch completed and verified!',
        percent: 100,
        elapsedSeconds: Math.round((Date.now() - startTime) / 1000),
      });

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#dc2626', '#10b981', '#fbbf24', '#ffffff'],
      });
    } catch (error) {
      revokeCashPdfUrls(generatedPdfResults);
      const message = getErrorMessage(error);
      if (message === 'Generation cancelled by user') {
        setCashProgress({
          status: 'cancelled',
          currentCount: 0,
          totalCount: total,
          currentStep: 'Generation cancelled',
          percent: 0,
        });
      } else {
        console.error('Cash generation failure:', error);
        setCashProgress({
          status: 'error',
          currentCount: 0,
          totalCount: total,
          currentStep: 'Generation failed',
          percent: 0,
          error: message,
        });
        alert(`Cash Generation Error: ${message}`);
      }
    }
  };

  const handleCancelGeneration = (): void => {
    cancellationRef.current = true;
  };

  const handleCancelCashGeneration = (): void => {
    cashCancellationRef.current = true;
  };

  const handleStartNewBatch = (): void => {
    setBatchData(null);
    revokePdfUrls(pdfFiles);
    setPdfFiles([]);
    setProgress(IDLE_PROGRESS);
    setCurrentScreen('config');
  };

  const handleStartNewCashBatch = (): void => {
    setCashBatchData(null);
    revokeCashPdfUrls(cashPdfFiles);
    setCashPdfFiles([]);
    setCashProgress(IDLE_PROGRESS);
    setCurrentScreen('config');
  };

  const hasGenerated =
    campaignMode === 'cash'
      ? cashProgress.status === 'completed' && cashBatchData !== null
      : progress.status === 'completed' && batchData !== null;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-900">
      <Header
        campaignMode={campaignMode}
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        onChangeCampaignMode={handleCampaignModeChange}
        hasGenerated={hasGenerated}
      />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full">
        {campaignMode === 'draw' && currentScreen === 'config' && (
          <ConfigScreen
            config={config}
            onChange={handleConfigChange}
            errors={errors}
            isValid={isValid}
            onProceedToPreview={() => setCurrentScreen('preview')}
            onDirectGenerate={handleStartGeneration}
          />
        )}

        {campaignMode === 'draw' && currentScreen === 'preview' && (
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

        {campaignMode === 'draw' && currentScreen === 'generation' && (
          <GenerationScreen
            config={config}
            progress={progress}
            batchData={batchData}
            pdfFiles={pdfFiles}
            onCancelGeneration={handleCancelGeneration}
            onStartNewBatch={handleStartNewBatch}
          />
        )}

        {campaignMode === 'cash' && currentScreen === 'config' && (
          <CashConfigScreen
            config={cashConfig}
            onChange={handleCashConfigChange}
            errors={cashErrors}
            isValid={isCashValid}
            onProceedToPreview={() => setCurrentScreen('preview')}
            onDirectGenerate={handleStartCashGeneration}
          />
        )}

        {campaignMode === 'cash' && currentScreen === 'preview' && (
          <CashPreviewScreen
            config={cashConfig}
            onBackToConfig={() => setCurrentScreen('config')}
            onStartGeneration={handleStartCashGeneration}
          />
        )}

        {campaignMode === 'cash' && currentScreen === 'generation' && (
          <CashGenerationScreen
            progress={cashProgress}
            batchData={cashBatchData}
            pdfFiles={cashPdfFiles}
            onCancelGeneration={handleCancelCashGeneration}
            onStartNewBatch={handleStartNewCashBatch}
          />
        )}
      </main>

      <footer className="border-t border-stone-800/80 bg-stone-950 py-5 text-center text-xs text-stone-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Fresh Masala. All rights reserved. Promotional Giveaway Operations Engine.</p>
          <p className="text-stone-400 text-[11px]">
            Weekly draw and cash-prize batches generated client-side with cryptographic tokens.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
