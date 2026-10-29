import React from 'react';
import {
  Banknote,
  CheckCircle2,
  Eye,
  FileText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { CampaignMode } from '../types/coupon';

interface HeaderProps {
  campaignMode: CampaignMode;
  currentScreen: 'config' | 'preview' | 'generation';
  onNavigate: (screen: 'config' | 'preview' | 'generation') => void;
  onChangeCampaignMode: (mode: CampaignMode) => void;
  hasGenerated: boolean;
}

const NAV_LABELS: Record<
  CampaignMode,
  { config: string; preview: string; generation: string }
> = {
  draw: {
    config: '1. Config',
    preview: '2. Live Preview',
    generation: '3. Batch Export',
  },
  cash: {
    config: '1. Prize Setup',
    preview: '2. Card Preview',
    generation: '3. Generate & Export',
  },
};

export const Header: React.FC<HeaderProps> = ({
  campaignMode,
  currentScreen,
  onNavigate,
  onChangeCampaignMode,
  hasGenerated,
}) => {
  const labels = NAV_LABELS[campaignMode];

  return (
    <header className="border-b border-amber-900/50 bg-stone-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600 via-rose-700 to-amber-600 p-0.5 shadow-festive-glow flex items-center justify-center">
              <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-festive flex items-center gap-2">
                  <span className="text-gold-gradient font-black tracking-wider">FRESH MASALA</span>
                  <span className="text-stone-300 font-sans font-semibold text-sm sm:text-base">
                    Coupon Generator
                  </span>
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {campaignMode === 'cash' ? 'Cash Prize Edition 2026' : 'Festive Draw Edition 2026'}
                </span>
              </div>
              <p className="text-xs text-stone-400 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Client-Side Generation • Web Crypto Tokens • No Coupon Data Uploaded
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center bg-stone-950/90 p-1 rounded-xl border border-stone-800 shadow-inner w-full sm:w-auto">
              <button
                onClick={() => onChangeCampaignMode('draw')}
                aria-pressed={campaignMode === 'draw'}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  campaignMode === 'draw'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Weekly Draw
              </button>
              <button
                onClick={() => onChangeCampaignMode('cash')}
                aria-pressed={campaignMode === 'cash'}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  campaignMode === 'cash'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                Cash Prize
              </button>
            </div>

            <nav className="flex items-center bg-stone-900/90 p-1 rounded-xl border border-stone-800 shadow-inner w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => onNavigate('config')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  currentScreen === 'config'
                    ? 'bg-gradient-to-r from-red-900 to-amber-900 text-amber-200 border border-amber-600/40 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{labels.config}</span>
              </button>

              <span className="text-stone-700 mx-0.5">›</span>

              <button
                onClick={() => onNavigate('preview')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  currentScreen === 'preview'
                    ? 'bg-gradient-to-r from-red-900 to-amber-900 text-amber-200 border border-amber-600/40 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{labels.preview}</span>
              </button>

              <span className="text-stone-700 mx-0.5">›</span>

              <button
                onClick={() => onNavigate('generation')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  currentScreen === 'generation'
                    ? 'bg-gradient-to-r from-red-900 to-amber-900 text-amber-200 border border-amber-600/40 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{labels.generation}</span>
                {hasGenerated && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};
