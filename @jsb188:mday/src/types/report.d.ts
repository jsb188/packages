import { REPORT_SORT_OPTS, REPORT_TYPES, REPORT_ROW_PRESETS } from '../constants/report';

/**
 * Enums
 */

type ReportTypeEnum = typeof REPORT_TYPES[number];
type ReportRowPresetEnum = typeof REPORT_ROW_PRESETS[number];
type ReportsSortEnum = typeof REPORT_SORT_OPTS[number];

/**
 * Filters
 */

export interface ReportsFilterArgs {
	preset?: '?' | null;
	reportType: ReportTypeEnum;
	period: string; // YYYY-MM-DD
  groupByOrgs?: boolean;
	query?: string | null;
}

/**
 * Report; fields
 */

interface ReportFieldsObj {
  gridLayoutStyle?: string;
	sections?: ReportFieldsSection[];
	rows?: ReportFieldsRow[];
  metadata?: ReportFieldsRow[];
  variables: {
    month?: number; // Used for MONTH presets (required for all preset="MONTH" rows)
    [key: string]: any;
  };
}

interface ReportFieldsSection {
	id?: string; // GraphQL Cursor, client-side only, but if present in Server, it will be an Array
	key: string; // Every section must have a unique string UID
	isGroupTitle?: boolean;
	title: string;
	description: string;
}

interface ReportFieldsRow {
	key: string; // Key is used to map row/columns to answers
	preset?: ReportRowPresetEnum;
  className?: string;
  isHeader?: boolean;
	columns: Partial<ReportFieldsColumn>[];
}

interface ReportFieldsColumn {
	id: string; // GraphQL Cursor, client-side only, but if present in Server, it will be an Array
  key: string; // Key is used to map column to answers
  className: string;
  label: string;
	text: string;
	placeholder: string | null;
  value: string | null; // Available only in server; this value has the indexes to map answers to directly without keys
  checked: boolean | null;
}

/**
 * Report data
 */

export interface ReportData {
	__table: 'reports';

	id: number;
	type: ReportTypeEnum;
	title: string;
	description: string;
	order: number;

	fields: ReportFieldsObj;
	submission?: ReportSubmissionData | null;

	template?: {
		__table: 'report_templates';
		id: number;
		fields: ReportFieldsObj;
		description: string | null;
	};
}

export interface ReportGQL {
	__deleted?: boolean;

	id: string;
	organizationId: string;
	title: string;
	description: string;
	type: ReportTypeEnum;
	period: string; // YYYY-MM-DD
	activityAt: string | null; // ISO date string

	sections?: ReportFieldsSection[];
	rows?: ReportFieldsRow[];
}

export interface ReportSubmissionData {
	__table: 'report_submissions';
	id: number;
  organizationId: number;
  reportId: number;
  period: string; // YYYY-MM-DD
  answers: Record<string, any>; // key-value pairs of answers
  activityAt: Date;
}
