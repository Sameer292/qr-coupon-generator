// High-quality SVG default logo for Fresh Masala optimized for light/beige background
export const DEFAULT_FRESH_MASALA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 120" width="360" height="120">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D97706"/>
      <stop offset="50%" stop-color="#B45309"/>
      <stop offset="100%" stop-color="#92400E"/>
    </linearGradient>
    <linearGradient id="chiliGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#DC2626"/>
      <stop offset="100%" stop-color="#991B1B"/>
    </linearGradient>
    <linearGradient id="crimsonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#881337"/>
      <stop offset="100%" stop-color="#4C0519"/>
    </linearGradient>
  </defs>
  
  <!-- Spice Seal Icon -->
  <g transform="translate(10, 10)">
    <!-- Outer ornate circle -->
    <circle cx="50" cy="50" r="46" fill="#7f1d1d" stroke="url(#goldGrad)" stroke-width="3" stroke-dasharray="4,2"/>
    <circle cx="50" cy="50" r="40" fill="#450a0a" stroke="url(#goldGrad)" stroke-width="1.5"/>
    
    <!-- Spice Mortar & Star / Chili Motif -->
    <!-- Star Anise Petals -->
    <g transform="translate(50, 50) scale(0.65)" fill="#F59E0B">
      <path d="M 0,-30 C 6,-15 12,-15 0,0 C -12,-15 -6,-15 0,-30 Z" />
      <path d="M 0,30 C 6,15 12,15 0,0 C -12,15 -6,15 0,30 Z" />
      <path d="M -30,0 C -15,6 -15,12 0,0 C -15,-12 -15,-6 -30,0 Z" />
      <path d="M 30,0 C 15,6 15,12 0,0 C 15,-12 15,-6 30,0 Z" />
      <path d="M -21,-21 C -7,-13 -13,-7 0,0 C -13,-7 -7,-13 -21,-21 Z" />
      <path d="M 21,21 C 7,13 13,7 0,0 C 13,7 7,13 21,21 Z" />
      <path d="M 21,-21 C 13,-7 7,-13 0,0 C 7,-13 13,-7 21,-21 Z" />
      <path d="M -21,21 C -13,7 -7,13 0,0 C -7,13 -13,7 -21,21 Z" />
      <circle cx="0" cy="0" r="8" fill="#7f1d1d" stroke="#F59E0B" stroke-width="2"/>
    </g>
    <!-- Little Chili accent -->
    <path d="M 46 26 C 54 20 62 28 58 38 C 55 45 48 54 44 58 C 46 50 48 42 46 36 Z" fill="url(#chiliGrad)"/>
  </g>

  <!-- Typography -->
  <g transform="translate(115, 20)">
    <!-- Brand Name -->
    <text x="0" y="38" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-size="34" font-weight="900" letter-spacing="2" fill="url(#crimsonGrad)">FRESH MASALA</text>
    
    <!-- Subtitle Banner -->
    <rect x="0" y="48" width="225" height="2" fill="url(#goldGrad)" opacity="0.9"/>
    <text x="0" y="67" font-family="'Inter', sans-serif" font-size="12" font-weight="800" letter-spacing="3.5" fill="#B45309">PREMIUM SPICES &amp; FLAVOURS</text>
    <text x="0" y="83" font-family="'Inter', sans-serif" font-size="9" font-weight="700" letter-spacing="1.5" fill="#78350F">TRADITION OF AUTHENTIC TASTE</text>
  </g>
</svg>`;

export const DEFAULT_LOGO_DATA_URL = `data:image/svg+xml;base64,${typeof btoa !== 'undefined' ? btoa(DEFAULT_FRESH_MASALA_LOGO_SVG) : Buffer.from(DEFAULT_FRESH_MASALA_LOGO_SVG).toString('base64')}`;
