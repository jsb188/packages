import type { AccountObj } from '@jsb188/app/types/account.d.ts';
import type { LabelAndValue } from '@jsb188/app/types/other.d.ts';
import type {
  WorkflowActionGQL,
  WorkflowActionObj,
} from '@jsb188/mday/types/action.d.ts';
import {
  LOG_ACTION_STATUS_ENUMS,
  LOG_ARABLE_ACTIVITY_ENUMS,
  LOG_FARMERS_MARKET_ACTIVITY_ENUMS,
  LOG_GROWER_NETWORK_ACTIVITY_ENUMS,
  LOG_LIVESTOCK_ACTIVITY_ENUMS,
  LOG_SORT_ENUMS,
} from '../constants/log.ts';
import type { OrganizationOperationEnum } from '../types/organization.d.ts';
import type { StorageGQL } from './storage';

/**
 * Enums
 */

export type LogActionStatusEnum = (typeof LOG_ACTION_STATUS_ENUMS)[number];
export type LogContentName = 'log' | 'ai_task' | 'invoice' | 'receipt'; // For UI visuals, client-side only
export type LogSortEnum = typeof LOG_SORT_ENUMS[number];

/**
 * Arable
 */

export type LogArableTypeEnum =
  | 'SEED'
  | 'PLANTING'
  | 'FIELD'
  | 'HARVEST'
  | 'POST_HARVEST'
  | 'SALES'
  | 'WATER'
  | 'HYGIENE'
  | 'SANITATION'
  | 'EQUIPMENT'
  | 'BIOSECURITY'
  | 'EMPLOYEE';
export type LogArableActivityEnum = typeof LOG_ARABLE_ACTIVITY_ENUMS[number];

/**
 * Farmers Market
 */

export type LogFarmersMarketTypeEnum = 'MARKET_RECEIPT' | 'MARKET_OPERATION';
export type LogFarmersMarketActivityEnum =
  typeof LOG_FARMERS_MARKET_ACTIVITY_ENUMS[number];

/**
 * Grower Network
 */

export type LogGrowerNetworkTypeEnum =
  | 'WORKER_PRACTICE'
  | 'EQUIPMENT'
  | 'FIELD'
  | 'PRODUCTION_INPUT'
  | 'OPERATION';
export type LogGrowerNetworkActivityEnum =
  typeof LOG_GROWER_NETWORK_ACTIVITY_ENUMS[number];

/**
 * Livestock
 */

export type LogLivestockTypeEnum =
  | 'SUPPLY_PURCHASE'
  | 'LIVESTOCK_LIFE_CYCLE'
  | 'LIVESTOCK_TRACKING'
  | 'PASTURE_LAND_MANAGEMENT'
  | 'LIVESTOCK_HEALTHCARE'
  | 'LIVESTOCK_SALE';
export type LogLivestockActivityEnum =
  typeof LOG_LIVESTOCK_ACTIVITY_ENUMS[number];

/**
 * All log types/activities Union
 */

export type LogTypeEnum =
  | LogArableTypeEnum
  | LogFarmersMarketTypeEnum
  | LogGrowerNetworkTypeEnum
  | LogLivestockTypeEnum
  | 'AI_TASK';

export type LogActivityEnum =
  | LogArableActivityEnum
  | LogFarmersMarketActivityEnum
  | LogGrowerNetworkActivityEnum
  | LogLivestockActivityEnum;

/**
 * Log metadata
 */

interface LogMetadataBase {
  __before: any;
  item: string;
  date: string;
  time: string;
  otherParty?: string;
  referenceNumber?: string;

  // Interface specific
  values?: LabelAndValue[];
  voided?: boolean;

  // Below are DEPRECATED; and safe to delete when old AI Tasks feature is removed
  recurFromLogId?: number;
  recurredCount?: number;
  summary?: string;
  location?: string;
  tax?: number; // Need to be removed and replaced by values[#].tax -- but this will require some logic changes
}

export interface LogArableMetadata extends LogMetadataBase {
  fieldLocation?: string;
  quantity: number;
  unit: string;
  concentration: number;
  concentrationUnit: string;
}

export interface LogFarmersMarketMetadata extends LogMetadataBase {
  values: LabelAndValue[];
}

export interface LogGrowerNetworkMetadata extends LogMetadataBase {
  fieldLocation?: string;
}

export interface LogLivestockMetadata extends LogMetadataBase {
  fieldLocation?: string;
}

/**
 * Log *_details table
 */

export interface LogDetailsBase {
  id: number | bigint;
  childOrg?: {
    id: number | bigint;
    name: string;
    operation?: OrganizationOperationEnum | null;
  };
  childOrgId?: number | bigint | null;
  reportId?: number | bigint | null;
  reportSubmissionId?: number | bigint | null;
  siteId?: number | bigint | null;
  site?: {
    id: number | bigint;
    name: string;
  };
  location?: {
    name: string;
  } | null;
  notes: string | null;
  translation: string | null;
}

export interface LogArableDetailsData extends LogDetailsBase {
  __table: 'logs_arable';
  activity: LogArableActivityEnum;
  metadata?: Partial<LogArableMetadata> | null;
}

export interface LogFarmersMarketDetailsData extends LogDetailsBase {
  __table: 'logs_farmers_market';
  activity: LogFarmersMarketActivityEnum;
  metadata?: Partial<LogFarmersMarketMetadata> | null;
}

export interface LogGrowerNetworkDetailsData extends LogDetailsBase {
  __table: 'logs_grower_network';
  activity: LogGrowerNetworkActivityEnum;
  animalRisk: boolean;
  equipmentRisk: boolean;
  fieldRisk: boolean;
  contaminationRisk: boolean;
  hygieneRisk: boolean;
  pestsRisk: boolean;
  sanitationRisk: boolean;
  metadata?: Partial<LogGrowerNetworkMetadata> | null;
}

export interface LogLivestockDetailsData extends LogDetailsBase {
  __table: 'logs_livestock';
  activity: LogLivestockActivityEnum;
  metadata?: Partial<LogLivestockMetadata> | null;
}

/**
 * Log details union - GraphQL
 */

interface LogDetailsBaseGQL {
  id: string;
  type: LogTypeEnum;
  activity: LogActivityEnum;
  summary: string | null;
  notes: string;
}

export interface LogArableDetailsGQL extends LogDetailsBaseGQL {
  __typename: 'LogArable';

  item: string | null;
  quantity: number | null;
  unit: string | null;
  concentration: number | null;
  concentrationUnit: string | null;
  fieldLocation: string | null;
  otherParty: string | null;
  referenceNumber: string | null;
  values: LabelAndValue[] | null;
  tax: number | null;
  voided: boolean | null;
}

export interface LogFarmersMarketDetailsGQL extends LogDetailsBaseGQL {
  __typename: 'LogFarmersMarket';

  item: string | null;
  otherParty: string | null;
  referenceNumber: string | null;
  values: LabelAndValue[] | null;
  tax: number | null;
  voided: boolean | null;
}

export interface LogGrowerNetworkDetailsGQL extends LogDetailsBaseGQL {
  __typename: 'LogGrowerNetwork';

  animalRisk: boolean;
  equipmentRisk: boolean;
  fieldRisk: boolean;
  contaminationRisk: boolean;
  hygieneRisk: boolean;
  pestsRisk: boolean;
  sanitationRisk: boolean;
  otherParty: string | null;
  item: string | null;
  fieldLocation: string | null;
}

export interface LogLivestockDetailsGQL extends LogDetailsBaseGQL {
  __typename: 'LogLivestock';

  livestock: string | null;
  livestockIdentifiers: string[] | null;
  livestockGroup: string | null;
  damIdentifier: string | null;
  otherParty: string | null;
  referenceNumber: string | null;
  values: LabelAndValue[] | null;
  tax: number | null;
  voided: boolean | null;
  item: string | null;
  quantity: number | null;
  unit: string | null;
  price: number | null;
  fieldLocation: string | null;
}

/**
 * Union type for log details
 */

export type LogMetadataGQL =
  | LogArableDetailsGQL
  | LogFarmersMarketDetailsGQL
  | LogGrowerNetworkDetailsGQL
  | LogLivestockDetailsGQL;

/**
 * GQL data interfaces
 */

export interface LogEntryGQL {
  __typename: string;
  __deleted?: boolean;

  id: string;
  accountId: string;
  organizationId: string;
  childOrgId: string | null;
  childOrgName: string | null;
  reportId: string | null;
  reportSubmissionId: string | null;
  siteId: string | null;
  location: string | null;
  details: LogMetadataGQL;
  status: LogActionStatusEnum | null;
  summary: string;
  flagColor?: string | null;

  account: any;
  actions?: WorkflowActionGQL[];
  files: StorageGQL[];

  date: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface LogEntryInsertObj {
  id?: number | bigint; // Only for edits
  accountId: number | bigint;
  organizationId: number | bigint;
  childOrgId?: number | bigint | null;
  reportId?: number | bigint | null;
  reportSubmissionId?: number | bigint | null;
  siteId?: number | bigint | null;
  summary: string;
  status?: LogActionStatusEnum | null;
  details: any;
  date: Date;
}

export interface LogEntryData {
  __table: 'logs';
  id: number | bigint;
  accountId: number | bigint;
  organizationId: number | bigint;
  childOrgId?: number | bigint | null;
  childOrg?: {
    id: number | bigint;
    name: string;
    operation?: OrganizationOperationEnum | null;
  } | null;
  reportId?: number | bigint | null;
  reportSubmissionId?: number | bigint | null;
  siteId?: number | bigint | null;
  summary: string;
  location?: {
    name: string;
  } | null;
  status: LogActionStatusEnum | null;
  distance?: number; // For vector search
  details:
    | LogArableDetailsData
    | LogFarmersMarketDetailsData
    | LogGrowerNetworkDetailsData
    | LogLivestockDetailsData;
  date: Date;
  createdAt: Date;
  updatedAt: Date;

  // This is for outputs, but will never be set for inserts
  account?: AccountObj;
  actions?: WorkflowActionObj[];
}

/**
 * Filters for search for client-side
 */

export interface FilterLogEntriesArgs {
  accountId?: string | null; // Account ID to filter logs by account
  preset?: 'WEEKS_5' | 'AI_TASKS' | null;
  types?: LogTypeEnum[] | null;
  activities?: LogActivityEnum[] | null;
  startDate?: string | null; // CalDate, with dashes (YYYY-MM-DD)
  endDate?: string | null; // CalDate, with dashes (YYYY-MM-DD)
  timeZone?: string | null; // Timezone string, e.g., 'America/New_York'
  query?: string | null;
}
