// Color palette for memories - harmonious colors that work well together
export const MEMORY_COLORS = [
  // Warm reds/oranges
  "#ef766b", // coral (default)
  "#e85d4f",
  "#d4765e",
  "#c6535b",
  "#b86b4a",
  // Warm yellows/golds
  "#c9963a",
  "#b47b3f",
  "#a68a3e",
  // Greens
  "#668d68",
  "#5a8b5e",
  "#76a36d",
  "#8bbf7f",
  // Teals/cyans
  "#3f8290",
  "#4a9b9c",
  "#5dbdbc",
  // Blues
  "#4a6fa5",
  "#5b7db1",
  "#6e8fc4",
  // Purples
  "#8b6bb3",
  "#9a6480",
  "#a872c4",
  // Pinks
  "#c46a8a",
  "#d1709c",
  "#e07aaf",
];

// Generate a harmonious random color from the palette
export function getRandomMemoryColor(excludedColors: string[] = []): string {
  const available = MEMORY_COLORS.filter((c) => !excludedColors.includes(c));
  if (available.length === 0) return MEMORY_COLORS[0];
  return available[Math.floor(Math.random() * available.length)];
}

// Mix multiple colors into a single harmonious color
// Uses simple averaging in HSL space for better visual results
export function mixColors(colors: string[]): string {
  if (colors.length === 0) return MEMORY_COLORS[0];
  if (colors.length === 1) return colors[0];

  // Convert hex to HSL
  const toHsl = (hex: string): { h: number; s: number; l: number } => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  };

  // Average HSL values
  const avgH = colors.reduce((sum, c) => sum + toHsl(c).h, 0) / colors.length;
  const avgS = colors.reduce((sum, c) => sum + toHsl(c).s, 0) / colors.length;
  const avgL = colors.reduce((sum, c) => sum + toHsl(c).l, 0) / colors.length;

  // Convert back to hex
  const hslToHex = (h: number, s: number, l: number): string => {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  return hslToHex(avgH, avgS, avgL);
}

// Get a slightly varied shade of a color (for hover states, etc.)
export function getColorShade(hex: string, amount: number): string {
  // amount: positive for lighter, negative for darker
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// Available pin symbols
export const PIN_SYMBOLS = [
  { id: "pin", label: "Pin", icon: "📍" },
  { id: "heart", label: "Heart", icon: "♥" },
  { id: "star", label: "Star", icon: "★" },
  { id: "flag", label: "Flag", icon: "🚩" },
  { id: "diamond", label: "Diamond", icon: "◆" },
  { id: "square", label: "Square", icon: "■" },
  { id: "circle", label: "Circle", icon: "●" },
  { id: "home", label: "Home", icon: "🏠" },
  { id: "camera", label: "Camera", icon: "📷" },
  { id: "music", label: "Music", icon: "♪" },
] as const;

export type PinSymbol = (typeof PIN_SYMBOLS)[number]["id"];