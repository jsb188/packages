/**
 * Types
 */

type LightModeValue = 'LIGHT' | 'DARK' | 'SYSTEM';
type PlusGroupEnum = 'NORMAL' | 'PERKS' | 'PLUS' | 'PRO';

/**
 * Get light mode value
 */

export function getLightMode(mode: string, mobileApp: boolean): LightModeValue {
  if (!mode) {
    return 'LIGHT';
  }

  const index = mobileApp ? 1 : 0;
  const value = Number(mode.charAt(index));

  return (['LIGHT', 'SYSTEM', 'DARK'][value] || 'LIGHT') as LightModeValue;
}

/**
 * Update light mode value
 */

export function updateLightMode(mode_: string | undefined, newValue: LightModeValue, mobileApp: boolean): string {
  const mode = mode_ || '00';
  const index = mobileApp ? 1 : 0;

  let value = ['LIGHT', 'SYSTEM', 'DARK'].indexOf(newValue);
  if (value === -1) {
    value = 0;
  }

  return mode.substring(0, index) + value + mode.substring(index + 1);
}

/**
 * Get user's subscription & status
 */

export const getUserSubscription = (plus: any): {
  name: string | null;
  group: PlusGroupEnum;
  cancelled: boolean;
  expired: boolean;
  expireAt: Date | null;
} => {
  if (!plus) {
    return {
      name: null,
      group: 'NORMAL',
      cancelled: false,
      expired: false,
      expireAt: null,
    };
  }

  const expired = (new Date(plus.expireAt)).getTime() < Date.now();

  let group: PlusGroupEnum = 'NORMAL';
  if (!expired) {
    switch (plus.type) {
      case 'kajiwoto_plus':
      case 'kajiwoto_plus_yearly':
      case 'big_planet_plus':
      case 'big_planet_plus_yearly':
        group = 'PLUS';
        break;
      case 'kajiwoto_pro':
      case 'kajiwoto_pro_yearly':
      case 'big_planet_pro':
      case 'big_planet_pro_yearly':
        group = 'PRO';
        break;
      case 'perks':
        group = 'PERKS';
        break;
      default:
    }
  }

  return {
    name: plus.type,
    group,
    cancelled: !!plus.cancelled,
    expired,
    expireAt: plus.expireAt,
  };
};
