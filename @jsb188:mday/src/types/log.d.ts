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
	| 'FEED_MANAGEMENT'
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
 * Log data types
 */

interface LogDetailsGQLBase {
	__typename: string;
	id: string;
	type: any;
	activity: any;
	notes: string;
}

/**
 * Log details - Arable
 */

interface LogArableMetadata {
	crop: string;
	quantity: number;
	unit: string;
	concentration: number;
	concentrationUnit: string;
	price: number;
}

interface LogArableObj {
	type?: LogArableTypeEnum; // Only set in server if manually extended
	activity: LogArableActivityEnum;
	notes: string | null;
	translation?: string | null;
	metadata?: Partial<LogArableMetadata> | null;
}

interface LogArableDetailsObj extends LogArableObj {
	__table: 'logs_arable';
	id: number;
	childOrg: never;
}

/**
 * Log details - Farmers Market
 */

interface LogFarmersMarketMetadata {
	void: boolean;
	values: {
		label: string;
		value: string;
	}[];
}

interface LogFarmersMarketObj {
	childOrgId: number;
	type?: LogFarmersMarketTypeEnum; // Only set in server if manually extended
	activity: LogFarmersMarketActivityEnum;
	notes: string | null;
	translation?: string | null;
	metadata?: Partial<LogFarmersMarketMetadata> | null;
}

interface LogFarmersMarketDetailsObj extends LogFarmersMarketObj {
	__table: 'logs_farmers_market';
	id: number;
	childOrg: {
		name: string;
	};
}

/**
 * Log details - Livestock
 */

interface LogLivestockMetadata {
	livestock: string;
	livestockIdentifiers: string[];
	item: string;
	quantity: number;
	unit: string;
	price: number;
}

interface LogLivestockObj {
	type?: LogLivestockTypeEnum; // Only set in server if manually extended
	activity: LogLivestockActivityEnum;
	notes: string | null;
	translation?: string | null;
	metadata?: Partial<LogLivestockMetadata> | null;
}

interface LogLivestockDetailsObj extends LogLivestockObj {
	__table: 'logs_livestock';
	id: number;
	childOrg: never;
}

/**
 * Union type for log details
 */

export type LogDetailsObj = LogArableObj | LogFarmersMarketObj | LogLivestockObj;

/**
 * GQL data interfaces
 */

export interface LogEntryGQLData {
	id: string;
	accountId: string;
	organizationId: string;
	details: LogArableMetadata & LogDetailsGQLBase;

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
	startDate?: string | null; // CalDate, with dashes (YYYY-MM-DD)
	endDate?: string | null; // CalDate, with dashes (YYYY-MM-DD)
	timeZone?: string | null; // Timezone string, e.g., 'America/New_York'
	query?: string | null;
}
