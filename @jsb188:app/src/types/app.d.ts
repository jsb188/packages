import { COLORS } from '../constants/app';

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

export type ColorEnum = typeof COLORS[number];

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

// Web Socket events

type ResetQueryRuleEnum = 'ALWAYS' | 'IF_FRAGMENT_NOT_FOUND' | 'IF_FRAGMENT_FOUND' | 'NEVER';

export interface WSDataUpdateObj {
  id: string;
  route: string[]; // First items in the array have priority (Different org operations may not allow the actions handled by other org operations)
  message?: string | null; // If null, nothing will be visible to the client.
  messageType: 'NORMAL' | 'SUCCESS' | 'ERROR';
  resetQueryKeys?: string[]; // List of query keys including {variablesKey}
  resetQueryRule?: ResetQueryRuleEnum; // Defaults to "IF_FRAGMENT_FOUND"
  reactiveFragmentKeys?: string[]; // Fragment keys that are used to trigger reactivity
  fragments?: null | ({
    name: string;
    dataId: string;
    replaceId?: string; // Use this where client has a temporary ID that will be replaced by the server-side ID later
    data: any;
  } | null)[];
}

export interface WSAppContextUpdateObj {
  accountId: string;
  updates: [any, any][];
}
