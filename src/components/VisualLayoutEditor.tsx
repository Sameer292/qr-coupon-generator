import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Move,
  RotateCcw,
  Sliders,
  AlignHorizontalJustifyCenter,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { CouponConfig, CouponLayoutConfig } from '../types/coupon';
import { DEFAULT_LAYOUT_CONFIG } from '../types/coupon';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/couponCanvas';

export type EditableElementKey =
  | 'logo'
  | 'phone'
  | 'linktreeQr'
  | 'header'
  | 'couponBox'
  | 'footer'
  | 'verificationQr'
  | 'activationBanner';

interface VisualLayoutEditorProps {
  config: CouponConfig;
  onChangeLayout: (layout: CouponLayoutConfig) => void;
  onResetLayout: () => void;
}

interface ElementBounds {
  key: EditableElementKey;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const VisualLayoutEditor: React.FC<VisualLayoutEditorProps> = ({
  config,
  onChangeLayout,
  onResetLayout,
}) => {
  const layout = config.layout || DEFAULT_LAYOUT_CONFIG;
  const [selectedElement, setSelectedElement] = useState<EditableElementKey>('logo');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; elemX: number; elemY: number } | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Calculate bounding boxes in canvas coordinate space (1063 x 591)
  const getElementBounds = useCallback((key: EditableElementKey): ElementBounds => {
    switch (key) {
      case 'logo':
        return {
          key,
          label: 'Brand Logo',
          x: layout.logo.x - layout.logo.width / 2,
          y: layout.logo.y,
          width: layout.logo.width,
          height: layout.logo.height,
        };
      case 'phone':
        return {
          key,
          label: 'Phone Numbers',
          x: layout.phone.x - 140,
          y: layout.phone.y - 25,
          width: 280,
          height: 70,
        };
      case 'linktreeQr':
        return {
          key,
          label: 'Linktree QR & Caption',
          x: layout.linktreeQr.x - layout.linktreeQr.size / 2,
          y: layout.linktreeQr.y,
          width: layout.linktreeQr.size,
          height: layout.linktreeQr.size + 40,
        };
      case 'header':
        return {
          key,
          label: 'Festival Package Title',
          x: layout.header.x - layout.header.underlineWidth / 2,
          y: layout.header.y - layout.header.titleFontSize,
          width: layout.header.underlineWidth,
          height: layout.header.titleFontSize + 80,
        };
      case 'couponBox':
        return {
          key,
          label: 'Coupon Code Container',
          x: layout.couponBox.x - layout.couponBox.width / 2,
          y: layout.couponBox.y,
          width: layout.couponBox.width,
          height: layout.couponBox.height,
        };
      case 'footer':
        return {
          key,
          label: 'Footer Safe & Batch',
          x: layout.header.x - 180,
          y: layout.footer.safeTextY - 30,
          width: 360,
          height: 120,
        };
      case 'verificationQr':
        return {
          key,
          label: 'Verification QR & Badge',
          x: layout.verificationQr.x - layout.verificationQr.size / 2,
          y: layout.verificationQr.y - 35,
          width: layout.verificationQr.size,
          height: layout.verificationQr.size + 35,
        };
      case 'activationBanner':
        return {
          key,
          label: 'Activation Button Banner',
          x: layout.activationBanner.x - layout.activationBanner.width / 2,
          y: layout.activationBanner.y,
          width: layout.activationBanner.width,
          height: layout.activationBanner.height + 45,
        };
    }
  }, [layout]);

  const allElements: EditableElementKey[] = [
    'logo',
    'phone',
    'linktreeQr',
    'header',
    'couponBox',
    'verificationQr',
    'activationBanner',
    'footer',
  ];

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent, key: EditableElementKey) => {
    e.stopPropagation();
    setSelectedElement(key);
    setIsDragging(true);

    const bounds = getElementBounds(key);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elemX: bounds.x,
      elemY: bounds.y,
    });
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging || !dragStart || !overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    const deltaCanvasX = Math.round((e.clientX - dragStart.x) * scaleX);
    const deltaCanvasY = Math.round((e.clientY - dragStart.y) * scaleY);

    const newX = dragStart.elemX + deltaCanvasX;
    const newY = dragStart.elemY + deltaCanvasY;

    // Apply movement based on element key
    const nextLayout: CouponLayoutConfig = JSON.parse(JSON.stringify(layout));

    switch (selectedElement) {
      case 'logo':
        nextLayout.logo.x = Math.max(80, Math.min(CANVAS_WIDTH - 80, newX + layout.logo.width / 2));
        nextLayout.logo.y = Math.max(10, Math.min(CANVAS_HEIGHT - 60, newY));
        break;
      case 'phone':
        nextLayout.phone.x = Math.max(80, Math.min(CANVAS_WIDTH - 80, newX + 140));
        nextLayout.phone.y = Math.max(40, Math.min(CANVAS_HEIGHT - 40, newY + 25));
        break;
      case 'linktreeQr':
        nextLayout.linktreeQr.x = Math.max(80, Math.min(CANVAS_WIDTH - 80, newX + layout.linktreeQr.size / 2));
        nextLayout.linktreeQr.y = Math.max(40, Math.min(CANVAS_HEIGHT - 100, newY));
        break;
      case 'header':
        nextLayout.header.x = Math.max(100, Math.min(CANVAS_WIDTH - 100, newX + layout.header.underlineWidth / 2));
        nextLayout.header.y = Math.max(30, Math.min(CANVAS_HEIGHT - 80, newY + layout.header.titleFontSize));
        nextLayout.header.subtitleY = nextLayout.header.y + 66;
        break;
      case 'couponBox':
        nextLayout.couponBox.x = Math.max(100, Math.min(CANVAS_WIDTH - 100, newX + layout.couponBox.width / 2));
        nextLayout.couponBox.y = Math.max(40, Math.min(CANVAS_HEIGHT - 100, newY));
        break;
      case 'footer':
        nextLayout.footer.safeTextY = Math.max(100, Math.min(CANVAS_HEIGHT - 60, newY + 30));
        nextLayout.footer.batchY = nextLayout.footer.safeTextY + 44;
        nextLayout.footer.campaignY = nextLayout.footer.batchY + 42;
        break;
      case 'verificationQr':
        nextLayout.verificationQr.x = Math.max(100, Math.min(CANVAS_WIDTH - 100, newX + layout.verificationQr.size / 2));
        nextLayout.verificationQr.y = Math.max(40, Math.min(CANVAS_HEIGHT - 100, newY + 35));
        break;
      case 'activationBanner':
        nextLayout.activationBanner.x = Math.max(100, Math.min(CANVAS_WIDTH - 100, newX + layout.activationBanner.width / 2));
        nextLayout.activationBanner.y = Math.max(40, Math.min(CANVAS_HEIGHT - 60, newY));
        nextLayout.activationBanner.subtextY = nextLayout.activationBanner.y + layout.activationBanner.height + 30;
        break;
    }

    onChangeLayout(nextLayout);
  }, [isDragging, dragStart, layout, selectedElement, onChangeLayout]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Update helper
  const updateLayoutValue = <K extends keyof CouponLayoutConfig>(
    section: K,
    key: keyof CouponLayoutConfig[K],
    value: number
  ) => {
    const next = JSON.parse(JSON.stringify(layout)) as CouponLayoutConfig;
    (next[section] as any)[key] = value;
    onChangeLayout(next);
  };

  // Center horizontally
  const centerSelected = () => {
    const next = JSON.parse(JSON.stringify(layout)) as CouponLayoutConfig;
    if (selectedElement === 'logo') next.logo.x = 170;
    if (selectedElement === 'phone') next.phone.x = 170;
    if (selectedElement === 'linktreeQr') next.linktreeQr.x = 170;
    if (selectedElement === 'header') next.header.x = 522;
    if (selectedElement === 'couponBox') next.couponBox.x = 522;
    if (selectedElement === 'verificationQr') next.verificationQr.x = 890;
    if (selectedElement === 'activationBanner') next.activationBanner.x = 890;
    onChangeLayout(next);
  };

  // Reset single element
  const resetSelectedElement = () => {
    const next = JSON.parse(JSON.stringify(layout)) as CouponLayoutConfig;
    next[selectedElement] = JSON.parse(JSON.stringify(DEFAULT_LAYOUT_CONFIG[selectedElement]));
    onChangeLayout(next);
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Interactive Drag-and-Drop Overlay on the Card */}
      <div className="relative">
        <div
          ref={overlayRef}
          className="absolute inset-0 z-20 pointer-events-auto select-none rounded-xl overflow-hidden"
          style={{ aspectRatio: '90/50' }}
        >
          {allElements.map((key) => {
            const bounds = getElementBounds(key);
            const isSelected = selectedElement === key;
            const leftPct = (bounds.x / CANVAS_WIDTH) * 100;
            const topPct = (bounds.y / CANVAS_HEIGHT) * 100;
            const widthPct = (bounds.width / CANVAS_WIDTH) * 100;
            const heightPct = (bounds.height / CANVAS_HEIGHT) * 100;

            return (
              <div
                key={key}
                onPointerDown={(e) => handlePointerDown(e, key)}
                className={`absolute cursor-move transition-colors rounded-lg flex items-start justify-between p-1 group ${
                  isSelected
                    ? 'border-2 border-amber-400 bg-amber-400/15 ring-2 ring-amber-400/30 shadow-lg'
                    : 'border border-dashed border-sky-400/50 hover:border-amber-400/80 hover:bg-amber-400/10'
                }`}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
              >
                {/* Element Badge Tag */}
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow transition-opacity ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 font-black opacity-100'
                      : 'bg-stone-900/80 text-stone-300 opacity-60 group-hover:opacity-100'
                  }`}
                >
                  {bounds.label}
                </span>

                {/* Move Icon */}
                <Move
                  className={`w-3.5 h-3.5 ${
                    isSelected ? 'text-amber-300' : 'text-stone-400 group-hover:text-amber-300'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Interactive Element Inspector & Fine-Tuning Controls */}
      <div className="bg-stone-900/95 border border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
        
        {/* Header toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Visual Element Inspector
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={centerSelected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-lg border border-stone-700 transition-colors cursor-pointer"
            >
              <AlignHorizontalJustifyCenter className="w-3.5 h-3.5 text-amber-400" />
              Center In Column
            </button>

            <button
              onClick={resetSelectedElement}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-lg border border-stone-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              Reset Element
            </button>

            <button
              onClick={onResetLayout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-950 hover:bg-stone-900 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/40 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Reset All to Defaults
            </button>

            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
            >
              {panelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Element Selection Pills */}
        <div className="flex flex-wrap gap-1.5">
          {allElements.map((key) => {
            const bounds = getElementBounds(key);
            const isSelected = selectedElement === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedElement(key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-md shadow-amber-500/20 scale-102'
                    : 'bg-stone-950 text-stone-300 hover:bg-stone-800 border border-stone-800'
                }`}
              >
                <span>{bounds.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>

        {/* Collapsible Sliders Panel for the active element */}
        {panelOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 text-xs">
            
            {/* LOGO CONTROLS */}
            {selectedElement === 'logo' && (
              <>
                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Horizontal Center (X)</span>
                    <span className="font-mono text-amber-300">{layout.logo.x}px</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={400}
                    value={layout.logo.x}
                    onChange={(e) => updateLayoutValue('logo', 'x', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Vertical Position (Y)</span>
                    <span className="font-mono text-amber-300">{layout.logo.y}px</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={120}
                    value={layout.logo.y}
                    onChange={(e) => updateLayoutValue('logo', 'y', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Logo Width</span>
                    <span className="font-mono text-amber-300">{layout.logo.width}px</span>
                  </div>
                  <input
                    type="range"
                    min={150}
                    max={330}
                    value={layout.logo.width}
                    onChange={(e) => updateLayoutValue('logo', 'width', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Logo Height</span>
                    <span className="font-mono text-amber-300">{layout.logo.height}px</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={160}
                    value={layout.logo.height}
                    onChange={(e) => updateLayoutValue('logo', 'height', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </>
            )}

            {/* PHONE CONTROLS */}
            {selectedElement === 'phone' && (
              <>
                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Horizontal Center (X)</span>
                    <span className="font-mono text-amber-300">{layout.phone.x}px</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={350}
                    value={layout.phone.x}
                    onChange={(e) => updateLayoutValue('phone', 'x', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Vertical Position (Y)</span>
                    <span className="font-mono text-amber-300">{layout.phone.y}px</span>
                  </div>
                  <input
                    type="range"
                    min={120}
                    max={260}
                    value={layout.phone.y}
                    onChange={(e) => updateLayoutValue('phone', 'y', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>WhatsApp Font Size</span>
                    <span className="font-mono text-amber-300">{layout.phone.waFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={36}
                    value={layout.phone.waFontSize}
                    onChange={(e) => updateLayoutValue('phone', 'waFontSize', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Landline Font Size</span>
                    <span className="font-mono text-amber-300">{layout.phone.landlineFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={34}
                    value={layout.phone.landlineFontSize}
                    onChange={(e) => updateLayoutValue('phone', 'landlineFontSize', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </>
            )}

            {/* LINKTREE QR CONTROLS */}
            {selectedElement === 'linktreeQr' && (
              <>
                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Horizontal Center (X)</span>
                    <span className="font-mono text-amber-300">{layout.linktreeQr.x}px</span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={320}
                    value={layout.linktreeQr.x}
                    onChange={(e) => updateLayoutValue('linktreeQr', 'x', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Vertical Position (Y)</span>
                    <span className="font-mono text-amber-300">{layout.linktreeQr.y}px</span>
                  </div>
                  <input
                    type="range"
                    min={160}
                    max={320}
                    value={layout.linktreeQr.y}
                    onChange={(e) => updateLayoutValue('linktreeQr', 'y', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>QR Card Size</span>
                    <span className="font-mono text-amber-300">{layout.linktreeQr.size}px</span>
                  </div>
                  <input
                    type="range"
                    min={160}
                    max={260}
                    value={layout.linktreeQr.size}
                    onChange={(e) => updateLayoutValue('linktreeQr', 'size', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>"FOLLOW US" Font Size</span>
                    <span className="font-mono text-amber-300">{layout.linktreeQr.captionFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={28}
                    value={layout.linktreeQr.captionFontSize}
                    onChange={(e) => updateLayoutValue('linktreeQr', 'captionFontSize', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </>
            )}

            {/* HEADER CONTROLS */}
            {selectedElement === 'header' && (
              <>
                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Horizontal Center (X)</span>
                    <span className="font-mono text-amber-300">{layout.header.x}px</span>
                  </div>
                  <input
                    type="range"
                    min={350}
                    max={680}
                    value={layout.header.x}
                    onChange={(e) => updateLayoutValue('header', 'x', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Title Vertical (Y)</span>
                    <span className="font-mono text-amber-300">{layout.header.y}px</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={120}
                    value={layout.header.y}
                    onChange={(e) => updateLayoutValue('header', 'y', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Title Font Size</span>
                    <span className="font-mono text-amber-300">{layout.header.titleFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={28}
                    max={56}
                    value={layout.header.titleFontSize}
                    onChange={(e) => updateLayoutValue('header', 'titleFontSize', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Subtitle Font Size</span>
                    <span className="font-mono text-amber-300">{layout.header.subtitleFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={30}
                    value={layout.header.subtitleFontSize}
                    onChange={(e) => updateLayoutValue('header', 'subtitleFontSize', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </>
            )}

            {/* COUPON BOX CONTROLS */}
            {selectedElement === 'couponBox' && (
              <>
                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Box Width</span>
                    <span className="font-mono text-amber-300">{layout.couponBox.width}px</span>
                  </div>
                  <input
                    type="range"
                    min={260}
                    max={400}
                    value={layout.couponBox.width}
                    onChange={(e) => updateLayoutValue('couponBox', 'width', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Box Height</span>
                    <span className="font-mono text-amber-300">{layout.couponBox.height}px</span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={180}
                    value={layout.couponBox.height}
                    onChange={(e) => updateLayoutValue('couponBox', 'height', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Box Vertical (Y)</span>
                    <span className="font-mono text-amber-300">{layout.couponBox.y}px</span>
                  </div>
                  <input
                    type="range"
                    min={120}
                    max={260}
                    value={layout.couponBox.y}
                    onChange={(e) => updateLayoutValue('couponBox', 'y', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Code Font Size</span>
                    <span className="font-mono text-amber-300">{layout.couponBox.codeFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={36}
                    max={74}
                    value={layout.couponBox.codeFontSize}
                    onChange={(e) => updateLayoutValue('couponBox', 'codeFontSize', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </>
            )}

            {/* VERIFICATION QR CONTROLS */}
            {selectedElement === 'verificationQr' && (
              <>
                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Horizontal Center (X)</span>
                    <span className="font-mono text-amber-300">{layout.verificationQr.x}px</span>
                  </div>
                  <input
                    type="range"
                    min={740}
                    max={980}
                    value={layout.verificationQr.x}
                    onChange={(e) => updateLayoutValue('verificationQr', 'x', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Vertical Position (Y)</span>
                    <span className="font-mono text-amber-300">{layout.verificationQr.y}px</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={180}
                    value={layout.verificationQr.y}
                    onChange={(e) => updateLayoutValue('verificationQr', 'y', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>QR Card Size</span>
                    <span className="font-mono text-amber-300">{layout.verificationQr.size}px</span>
                  </div>
                  <input
                    type="range"
                    min={180}
                    max={270}
                    value={layout.verificationQr.size}
                    onChange={(e) => updateLayoutValue('verificationQr', 'size', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Badge Font Size</span>
                    <span className="font-mono text-amber-300">{layout.verificationQr.badgeFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={11}
                    max={22}
                    value={layout.verificationQr.badgeFontSize}
                    onChange={(e) => updateLayoutValue('verificationQr', 'badgeFontSize', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </>
            )}

            {/* ACTIVATION BANNER CONTROLS */}
            {selectedElement === 'activationBanner' && (
              <>
                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Banner Width</span>
                    <span className="font-mono text-amber-300">{layout.activationBanner.width}px</span>
                  </div>
                  <input
                    type="range"
                    min={200}
                    max={330}
                    value={layout.activationBanner.width}
                    onChange={(e) => updateLayoutValue('activationBanner', 'width', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Vertical Position (Y)</span>
                    <span className="font-mono text-amber-300">{layout.activationBanner.y}px</span>
                  </div>
                  <input
                    type="range"
                    min={280}
                    max={460}
                    value={layout.activationBanner.y}
                    onChange={(e) => updateLayoutValue('activationBanner', 'y', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Banner Font Size</span>
                    <span className="font-mono text-amber-300">{layout.activationBanner.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={26}
                    value={layout.activationBanner.fontSize}
                    onChange={(e) => updateLayoutValue('activationBanner', 'fontSize', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Subtext Font Size</span>
                    <span className="font-mono text-amber-300">{layout.activationBanner.subtextFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={24}
                    value={layout.activationBanner.subtextFontSize}
                    onChange={(e) => updateLayoutValue('activationBanner', 'subtextFontSize', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </>
            )}

            {/* FOOTER CONTROLS */}
            {selectedElement === 'footer' && (
              <>
                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>"Keep Safe" Vertical (Y)</span>
                    <span className="font-mono text-amber-300">{layout.footer.safeTextY}px</span>
                  </div>
                  <input
                    type="range"
                    min={340}
                    max={480}
                    value={layout.footer.safeTextY}
                    onChange={(e) => updateLayoutValue('footer', 'safeTextY', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>"Keep Safe" Font Size</span>
                    <span className="font-mono text-amber-300">{layout.footer.safeTextFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={28}
                    value={layout.footer.safeTextFontSize}
                    onChange={(e) => updateLayoutValue('footer', 'safeTextFontSize', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Batch Text Vertical (Y)</span>
                    <span className="font-mono text-amber-300">{layout.footer.batchY}px</span>
                  </div>
                  <input
                    type="range"
                    min={380}
                    max={520}
                    value={layout.footer.batchY}
                    onChange={(e) => updateLayoutValue('footer', 'batchY', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between font-bold text-stone-300">
                    <span>Batch Font Size</span>
                    <span className="font-mono text-amber-300">{layout.footer.batchFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={26}
                    value={layout.footer.batchFontSize}
                    onChange={(e) => updateLayoutValue('footer', 'batchFontSize', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
