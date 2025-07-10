import type { OrganizationOperationEnum } from '@jsb188/app/types/organization.d';
import { LOG_ARABLE_ACTIVITY_ENUMS } from '../constants/log';

// All logs types

export type LogArableTypeEnum = 'SEED' | 'FIELD' | 'HARVEST' | 'POST_HARVEST' | 'SALES';
export type LogTypeEnum = LogArableTypeEnum;

// All logs activities

export type LogArableActivityEnum = typeof LOG_ARABLE_ACTIVITY_ENUMS[number];
export type LogActivityEnum = LogArableActivityEnum;

// Log entry object

export interface LogArableObj {
  type: LogTypeEnum;
	activity: LogArableActivityEnum;
	item?: string;
	quantity?: number;
	unit?: string;
	price?: number;
  notes: string | null;
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

// Filters for search

export interface FilterLogEntriesArgs {
  operation: OrganizationOperationEnum;
  accountId?: string | null; // Account ID to filter logs by account
  types?: LogTypeEnum[] | null;
	startDate?: string | null;
	endDate?: string | null;
  timeZone?: string | null; // Timezone string, e.g., 'America/New_York'
	query?: string;
}
