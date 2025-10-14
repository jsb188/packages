import { memo } from 'react';
// import type { ReactSpanElement } from '../types/dom';
import * as IconSVGs from './IconSVGs';

/**
 * Convert cameCalsed string to dash-separated
 */

function camelCaseToDash(str: string) {
  if (/^[A-Z0-9]+$/.test(str)) {
    return str.toLowerCase();
  }
  return str.replace(/[A-Z0-9]/g, (m, i) => {
    return `${i ? '-' : ''}${m.toLowerCase()}`;
  });
}

/**
 * Icon map
 */

const ICON_MAP = Object.entries(IconSVGs).reduce((acc, [key, IconComponent]) => {
  acc[camelCaseToDash(key)] = IconComponent;
  return acc;
}, {} as Record<string, React.ReactNode>);

// Full icon map: https://tablericons.com/

/**
 * Types
 */

interface IconProps {
  name: string;
}

interface SpecialIconProps extends IconProps {
  name: string;
  cornerIconName?: string;
}

/**
 * Commonly used icon names
 */

export const COMMON_ICON_NAMES: Record<string, string> = {
  ai_magic: 'sparkles',
  address_book: 'address-book',
  alert_warning: 'alert-circle',
  billing: 'credit-card',
  broken_file: 'file-broken',
  call: 'phone-call',
  chat: 'message',
  click: 'click',
  close: 'x',
  close_small: 'x-filled',
  colors: 'color-swatch',
  copied: 'copy-check',
  daily: 'clock-share',
  description: 'notes',
  delete: 'trash-x',
  delete_filled: 'trash-x-filled',
  edit: 'edit',
  edit_off: 'edit-off',
  empty: 'square-forbid-2',
  favorites: 'stars',
  field_work: 'farming-field-sun',
  group: 'users-group',
  harvest: 'vegetable-corn',
  image: 'photo',
  images: 'library-photo',
  info: 'info-circle',
  invoice: 'accounting-invoice-dollar',
  link_chevron: 'chevron-right',
  live: 'broadcast',
  lock: 'lock',
  lock_filled: 'lock-filled',
  mobile: 'device-mobile',
  moderator: 'gavel',
  network_error: 'wifi-off',
  not_pinned: 'pinned-off',
  owner: 'crown',
  pensive: 'mood-sad-filled',
  personas: 'masks-theater',
  pinned: 'pinned',
  plans: 'map',
  plus: 'plus',
  plus_circle: 'circle-plus-filled',
  post_harvest: 'farming-barn-silo',
  read: 'checklist',
  receipt: 'receipt-dollar',
  report: 'exclamation-circle',
  seeding: 'organic-seedling-grow',
  smile: 'confetti',
  settings: 'settings',
  sms: 'device-mobile-message',
  snooze: 'zzz',
  sticker: 'sticker',
  switch_organization: 'replace',
  theme: 'photo-hexagon',
  timeout: 'clock-cancel',
  timeout_unban: 'clock-check',
  transplanting: 'organic-plant-grow',
  unread: 'mailbox',
  user: 'user',
  user_add: 'user-plus',
  user_scan: 'user-scan',
  user_blocked: 'user-x',
  user_deleted: 'user-off',
  your_account: 'user-circle',
};

/**
 * Simple icon with a very basic fix
 */

export const Icon = memo((p: IconProps & {
  tryColor?: boolean;
}) => {
  const { name: iconName, tryColor } = p;
  const IconComponent = (
    (tryColor && ICON_MAP[iconName + '-color']) ||
    ICON_MAP[iconName]
  );

  if (!IconComponent) {
    console.warn('Icon: Unknown icon name:', iconName);
  }

  return IconComponent || null;
});

Icon.displayName = 'Icon';

/**
 * Special icons that aren't included in FA
 */

export const SpecialIcon = memo((p: SpecialIconProps) => {
  const { name } = p;
  const className = 'ic_special';

  switch (name) {
    case 'google':
      return (
        <img
          alt='Google logo'
          src='/img/google-icon.png'
          className={className}
        />
      );
    default:
      console.warn('SpecialIcon: Unknown icon name:', name);
  }

  return null;
});

SpecialIcon.displayName = 'SpecialIcon';
