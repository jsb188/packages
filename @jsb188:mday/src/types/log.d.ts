import type { AccountObj } from '@jsb188/app/types/account.d';
import type { OrganizationOperationEnum } from '@jsb188/app/types/organization.d';
import {
  LOG_ARABLE_ACTIVITY_ENUMS,
  LOG_FARMERS_MARKET_ACTIVITY_ENUMS,
  LOG_LIVESTOCK_ACTIVITY_ENUMS,
} from '../constants/log';

/**
 * Arable
 */

export type LogArableTypeEnum = 'SEED' | 'PLANTING' | 'FIELD' | 'HARVEST' | 'POST_HARVEST' | 'SALES' | 'WATER';
export type LogArableActivityEnum = typeof LOG_ARABLE_ACTIVITY_ENUMS[number];

/**
 * Farmers Market
 */

export type LogFarmersMarketTypeEnum = 'MARKET_RECEIPTS' | 'MARKET_OPERATIONS';
export type LogFarmersMarketActivityEnum = typeof LOG_FARMERS_MARKET_ACTIVITY_ENUMS[number];

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
export type LogLivestockActivityEnum = typeof LOG_LIVESTOCK_ACTIVITY_ENUMS[number];

/**
 * All log types/activities Union
 */

export type LogTypeEnum = LogArableTypeEnum | LogFarmersMarketTypeEnum | LogLivestockTypeEnum;
export type LogActivityEnum = LogArableActivityEnum | LogFarmersMarketActivityEnum | LogLivestockActivityEnum;

/**
 * Log metadata
 */

interface LogDetailsGQLBase {
	__typename: string;
	id: string;
	type: any;
	activity: any;
	notes: string;
}

interface LogMetadataBase {
	__before: any;
  childOrg: never;
  childOrgId: never;
  referenceNumber: never;
}

interface LabelValueObj {
  label: string;
  value: string;
  quantity?: number;
}

/**
 * Log details - Arable
 */

export type LogArableMetadata = LogMetadataBase & {
	crop: string;
	quantity: number;
	unit: string;
	concentration: number;
	concentrationUnit: string;
  location: string;
  vendor?: string;
  referenceNumber?: string;
	values?: LabelValueObj[];
	price: number;
	tax: number;
};

export interface LogArableObj {
	type?: LogArableTypeEnum; // Only set in server if manually extended
	activity: LogArableActivityEnum;
	notes: string | null;
	translation?: string | null;
	metadata?: Partial<LogArableMetadata> | null;
}

export interface LogArableDetailsObj extends LogArableObj {
	__table: 'logs_arable';
	id: number;
	childOrg: never;
}

export type LogArableMetadataGQL = LogArableMetadata & LogDetailsGQLBase;

/**
 * Log details - Farmers Market
 */

export type LogFarmersMarketMetadata = LogMetadataBase & {
  referenceNumber: string;
	voided: boolean;
	childOrgId: string | number;
	values: LabelValueObj[];
};

export interface LogFarmersMarketObj {
	childOrgId: number;
	type?: LogFarmersMarketTypeEnum; // Only set in server if manually extended
	activity: LogFarmersMarketActivityEnum;
	notes: string | null;
	translation?: string | null;
	metadata?: Partial<LogFarmersMarketMetadata> | null;
}

export interface LogFarmersMarketDetailsObj extends LogFarmersMarketObj {
	__table: 'logs_farmers_market';
	id: number;
	childOrg: {
		name: string;
	};
}

export type LogFarmersMarketMetadataGQL = LogFarmersMarketMetadata & LogDetailsGQLBase;

/**
 * Log details - Livestock
 */

export type LogLivestockMetadata = LogMetadataBase & {
  damIdentifier?: string;
	livestockIdentifiers: string[];
	livestockGroup?: string;
	livestock: string;
  vendor?: string;
  referenceNumber?: string;
	values?: LabelValueObj[];
	item: string;
	quantity: number;
	unit: string;
  location: string;
	price: number;
	tax: number;
};

export interface LogLivestockObj {
	type?: LogLivestockTypeEnum; // Only set in server if manually extended
	activity: LogLivestockActivityEnum;
	notes: string | null;
	translation?: string | null;
  damIdentifier?: string;
	livestockIdentifiers: string[];
	livestockGroup?: string;
	metadata?: Partial<LogLivestockMetadata> | null;
}

export interface LogLivestockDetailsObj extends LogLivestockObj {
	__table: 'logs_livestock';
	id: number;
	childOrg: never;
}

export type LogLivestockMetadataGQL = LogLivestockMetadata & LogDetailsGQLBase;

/**
 * Union type for log details
 */

export type LogDetailsObj = LogArableObj | LogFarmersMarketObj | LogLivestockObj;
export type LogMetadataGQL = LogArableMetadataGQL | LogFarmersMarketMetadataGQL | LogLivestockMetadataGQL;

/**
 * GQL data interfaces
 */

export interface LogEntryGQL {
	id: string;
	accountId: string;
	organizationId: string;
	details: LogMetadataGQL;

	account: any;
	date: string; // ISO date string
	createdAt: string; // ISO date string
	updatedAt: string; // ISO date string
}

export interface LogEntryInsertObj {
	id?: number; // Only for edits
	accountId: number;
	organizationId: number;
	details: LogDetailsObj;
	date: Date;
}

export interface LogEntryDataObj {
	__table: 'logs';
	id: number;
	accountId: number;
	organizationId: number;
	distance?: number; // For vector search
	details: LogArableDetailsObj | LogFarmersMarketDetailsObj | LogLivestockDetailsObj;
	date: Date;
	createdAt: Date;
	updatedAt: Date;

	// This is for outputs, but will never be set for inserts
	account?: AccountObj;
}

/**
 * Filters for search for client-side
 */

export interface FilterLogEntriesArgs {
	operation: OrganizationOperationEnum;
	accountId?: string | null; // Account ID to filter logs by account
	types?: LogTypeEnum[] | null;
  activities?: LogActivityEnum[] | null;
	startDate?: string | null; // CalDate, with dashes (YYYY-MM-DD)
	endDate?: string | null; // CalDate, with dashes (YYYY-MM-DD)
	timeZone?: string | null; // Timezone string, e.g., 'America/New_York'
	query?: string | null;
}
