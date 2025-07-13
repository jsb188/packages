import type { OrganizationOperationEnum } from '@jsb188/app/types/organization.d';
import { LOG_ARABLE_ACTIVITY_ENUMS } from '../constants/log';

// All logs types

export type LogArableTypeEnum = 'SEED' | 'FIELD' | 'HARVEST' | 'POST_HARVEST' | 'SALES';
export type LogTypeEnum = LogArableTypeEnum;

// All logs activities

export type LogArableActivityEnum = typeof LOG_ARABLE_ACTIVITY_ENUMS[number];
export type LogActivityEnum = LogArableActivityEnum;

// Log entry object

interface LogArableObj {
	activity: LogArableActivityEnum;
	quantity?: number;
	unit?: string;
	price?: number;
	notes: string | null;
}

interface LogArableInsertObj extends LogArableObj {
	cropId: number | null;
}

interface LogArableDataObj extends LogArableObj {
	id: number;
	product: {
		id: number;
		name: string;
	};
}

export interface LogEntryGQLData {
  id: string
  accountId: string
  organizationId: string
  details: LogArableObj;

  account: any;
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
}

export interface LogEntryInsertObj {
	accountId: number;
	organizationId: number;
	organizationBranchId: number | null;
	details: LogArableInsertObj;
	createdAt: Date;
}

export interface LogEntryDataObj {
	accountId: number;
	organizationId: number;
	organizationBranchId: number | null;
	details: LogArableDataObj;
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
