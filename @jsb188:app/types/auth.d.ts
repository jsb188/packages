import type { OrganizationShortData } from './organization.d';

/**
 * Auth enums
 */

export type AuthTypeEnum = 'ID' | 'USERNAME' | 'EMAIL' | 'PHONE';
export type LightModeEnum = 'LIGHT' | 'DARK' | 'SYSTEM';

/**
 * Account
 */

export interface AccountData {
  id: string;
  deleted: boolean;
  color: string;

  plus: any; // placeholder for later

  settings: AccountSettings;

  profile: {
    id: string;
    firstName: string;
    lastName: string;
    photoId: string;
    photoUri: string;
  };

  email: {
    id: string;
    address: string;
    verified: boolean;
  };

  phone: {
    id: string;
    number: string;
    verified: boolean;
  };
}

export interface AccountSettings {
  theme: string | null;
  language: string;
  lightMode: LightModeEnum;
  timeZone: string | null;
  showSelfAvatar: boolean;
  isBubbleOther: boolean;
  showOtherAvatar: boolean;
}

/**
 * Auth context
 */

export interface AuthenticationData {
  token: string | null;
  timeZone: string | null;
  account: AccountData | null;
  settings: AccountSettings | null;
  primaryOrganizationId: string | null;
  activated: boolean;
  hasPassword: boolean;
  webVersion: string;
  mobileVersion: string;
  alertUpdatesOnMount: boolean;
}
