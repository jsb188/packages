
// Modal; App settings

export interface EditIfaceModalProps {
  containerClassName: string;
  saveCounter: number;
  saving: boolean;
  hasChanges: boolean;
  openModalPopUp: (opts: any) => void;
  onChangeDiff: (diff: boolean) => void;
}

export interface EditUserModalProps extends EditIfaceModalProps {
  user: any;
  editUser: (obj: object) => void;
}

export interface EditUserPlusModalProps extends EditIfaceModalProps {
  user: any;
  editUserPlus: (obj: object) => void;
}

// App types

export type DarkOrLightEnum = 'light' | 'dark';

export type ColorEnum = 'red' | 'orange' | 'brown' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose' | 'slate' | 'zinc' | 'stone';

// Stripe types

export type PlatformProductGroupEnum = 'PERKS' | 'PLUS' | 'PRO' | 'COINS';

// Server/API related types

export interface ServerErrorObj {
  statusCode: number;
  errorCode: string;
  errorValue?: string;
  iconName?: string;
  title: string;
  message: string;
}

export interface SimpleErrorType {
  iconName?: string;
  title?: string;
  message: string;
}
