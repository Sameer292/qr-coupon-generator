import React from 'react';
import { Sparkles, ShieldCheck, FileText, Eye, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  currentScreen: 'config' | 'preview' | 'generation';
  onNavigate: (screen: 'config' | 'preview' | 'generation') => void;
  hasGenerated: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentScreen, onNavigate, hasGenerated }) => {
  return (
    <header className="border-b border-amber-900/50 bg-stone-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600 via-rose-700 to-amber-600 p-0.5 shadow-festive-glow flex items-center justify-center">
              <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-festive flex items-center gap-2">
                  <span className="text-gold-gradient font-black tracking-wider">FRESH MASALA</span>
                  <span className="text-stone-300 font-sans font-semibold text-sm sm:text-base">Coupon Generator</span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Festive Edition 2026
                </span>
              </div>
              <p className="text-xs text-stone-400 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                100% Client-Side • Zero External Server Calls • Cryptographically Secure
              </p>
            </div>
          </div>

          {/* Step Navigation Bar */}
          <nav className="flex items-center bg-stone-900/90 p-1 rounded-xl border border-stone-800 shadow-inner">
            <button
              onClick={() => onNavigate('config')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentScreen === 'config'
                  ? 'bg-gradient-to-r from-red-900 to-amber-900 text-amber-200 border border-amber-600/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1. Config</span>
            </button>

            <span className="text-stone-700 mx-0.5">›</span>

            <button
              onClick={() => onNavigate('preview')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentScreen === 'preview'
                  ? 'bg-gradient-to-r from-red-900 to-amber-900 text-amber-200 border border-amber-600/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>2. Live Preview</span>
            </button>

            <span className="text-stone-700 mx-0.5">›</span>

            <button
              onClick={() => onNavigate('generation')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentScreen === 'generation'
                  ? 'bg-gradient-to-r from-red-900 to-amber-900 text-amber-200 border border-amber-600/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>3. Batch Export</span>
              {hasGenerated && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
