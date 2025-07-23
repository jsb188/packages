import type { OrganizationOperationEnum } from '@jsb188/app/types/organization.d';
import type { AccountObj } from '@jsb188/app/types/account.d';
import { LOG_ARABLE_ACTIVITY_ENUMS } from '../constants/log';

// All logs types

export type LogArableTypeEnum = 'SEED' | 'PLANTING' | 'FIELD' | 'HARVEST' | 'POST_HARVEST' | 'SALES' | 'WATER';
export type LogTypeEnum = LogArableTypeEnum;

// All logs activities

export type LogArableActivityEnum = typeof LOG_ARABLE_ACTIVITY_ENUMS[number];
export type LogActivityEnum = LogArableActivityEnum;

// Log entry object

interface LogArableObj {
  type?: LogArableTypeEnum; // Only set in server if manually extended
	activity: LogArableActivityEnum;
	notes: string | null;

	metadata?: Partial<{
		quantity: number;
		unit: string;
		concentration: number;
		concentrationUnit: string;
		price: number;
	}> | null;
}

interface LogArableInsertObj extends LogArableObj {
	cropId: number | null;
}

interface LogArableDetailsObj extends LogArableObj {
	__table: 'logs_arable';
	id: number;
	crop: {
		id: number;
		name: string;
	};
}

export interface LogEntryGQLData {
	id: string;
	accountId: string;
	organizationId: string;
	details: LogArableDetailsObj & { __typename: string; type: any };

	account: any;
	date: string; // ISO date string
	createdAt: string; // ISO date string
	updatedAt: string; // ISO date string
}

export interface LogEntryInsertObj {
	accountId: number;
	organizationId: number;
	organizationBranchId: number | null;
	details: LogArableInsertObj;
	date: Date;
}

export interface LogEntryDataObj {
	__table: 'logs';
	id: number;
	accountId: number;
	organizationId: number;
	organizationBranchId: number | null;
	details: LogArableDetailsObj;
	date: Date;
	createdAt: Date;
	updatedAt: Date;

	// This is for outputs, but will never be set for inserts
	account?: AccountObj;
}

// Filters for search

export interface FilterLogEntriesArgs {
	operation: OrganizationOperationEnum;
	accountId?: string | null; // Account ID to filter logs by account
	types?: LogTypeEnum[] | null;
	startDate?: string | null; // CalDate, with dashes (YYYY-MM-DD)
	endDate?: string | null; // CalDate, with dashes (YYYY-MM-DD)
	timeZone?: string | null; // Timezone string, e.g., 'America/New_York'
	query?: string | null;
}
