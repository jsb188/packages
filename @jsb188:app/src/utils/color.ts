import type { ColorEnum } from '../types/app.d.ts';

type RGBColorObj = {
  blue: number;
  green: number;
  red: number;
};

const APP_COLOR_HEX_VALUES: Record<ColorEnum, string> = {
  amber: '#f59e0b',
  blue: '#3b82f6',
  brown: '#a16207',
  cyan: '#06b6d4',
  emerald: '#10b981',
  fuchsia: '#d946ef',
  green: '#22c55e',
  indigo: '#6366f1',
  lime: '#84cc16',
  orange: '#f97316',
  pink: '#ec4899',
  purple: '#a855f7',
  red: '#ef4444',
  rose: '#f43f5e',
  sky: '#0ea5e9',
  slate: '#64748b',
  stone: '#78716c',
  teal: '#14b8a6',
  violet: '#8b5cf6',
  yellow: '#eab308',
  zinc: '#71717a',
};

/**
 * Return one app palette hex color picked deterministically by index.
 */
export function getAppColorHexByIndex(index: number): string {
  const hexValues = Object.values(APP_COLOR_HEX_VALUES);
  return hexValues[Math.abs(Math.floor(index)) % hexValues.length];
}

const RGB_COLOR_REGEX = /^rgba?\(([^)]+)\)$/i;
const HEX_COLOR_VALUE_REGEX = /^#[0-9a-f]{6}$/i;
const HEX_COLOR_DRAFT_VALUE_REGEX = /^#[0-9a-f]{0,6}$/i;

/**
 * Return whether one value is a valid hex color value or editable hex draft.
 */
export function isHexColorValue(value: string | null | undefined, allowDraft: boolean = false): boolean {
  const normalized = String(value || '').trim();

  if (allowDraft && !normalized) {
    return true;
  }

  return allowDraft
    ? HEX_COLOR_DRAFT_VALUE_REGEX.test(normalized)
    : HEX_COLOR_VALUE_REGEX.test(normalized);
}

/**
 * Convert a CSS hex color into RGB channel values.
 */
function getRGBColorFromHex(color: string): RGBColorObj | null {
  const normalized = color.trim().replace('#', '');
  const isShortHex = normalized.length === 3;
  const isLongHex = normalized.length === 6;

  if ((!isShortHex && !isLongHex) || /[^0-9a-f]/i.test(normalized)) {
    return null;
  }

  const fullHex = isShortHex
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  return {
    red: parseInt(fullHex.slice(0, 2), 16),
    green: parseInt(fullHex.slice(2, 4), 16),
    blue: parseInt(fullHex.slice(4, 6), 16),
  };
}

/**
 * Convert a CSS rgb() or rgba() color into RGB channel values.
 */
function getRGBColorFromRGBFunction(color: string): RGBColorObj | null {
  const match = color.trim().match(RGB_COLOR_REGEX);
  if (!match) {
    return null;
  }

  const channels = match[1].split(',').slice(0, 3).map((channel) => Number(channel.trim()));
  if (channels.length < 3 || channels.some((channel) => Number.isNaN(channel))) {
    return null;
  }

  return {
    red: channels[0],
    green: channels[1],
    blue: channels[2],
  };
}

/**
 * Convert a supported color value into RGB channel values.
 */
export function getRGBColor(color: string | null | undefined): RGBColorObj | null {
  if (!color) {
    return null;
  }

  const normalized = color.trim().toLowerCase();
  const appColorHex = APP_COLOR_HEX_VALUES[normalized as ColorEnum];

  if (appColorHex) {
    return getRGBColorFromHex(appColorHex);
  } else if (normalized.startsWith('#')) {
    return getRGBColorFromHex(normalized);
  }

  return getRGBColorFromRGBFunction(normalized);
}

/**
 * Return whether a color should be treated as dark based on perceived brightness.
 */
export function isDarkColor(color: string | null | undefined, fallback: boolean = false): boolean {
  const rgb = getRGBColor(color);
  if (!rgb) {
    return fallback;
  }

  const brightness = ((rgb.red * 299) + (rgb.green * 587) + (rgb.blue * 114)) / 1000;

  return brightness < 128;
}
