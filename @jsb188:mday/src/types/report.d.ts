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
	query?: string | null;
}

/**
 * Report; fields
 */

interface ReportFieldsObj {
	__allowMultiples?: boolean; // Allow multiple copies of the same report (from 1 report template)
	__notAutomated?: boolean; // If true, report is not skipped during automation
	__prompt: string; // Server-only, this prompt used on the entire report as a whole (ie. OSP generation)
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
	sectionKey: string;
	sectionName: string;
	title: string;
	description: string;
	rows?: ReportFieldsRow[];
  requireFileUploads?: boolean;

	__prompt_section?: string; // Server-only; full prompt for this section - this is the only prompt that allows {{variable}} regex
	__prompt_examples?: string; // Server-only; for examples of what the output should be
	__prompt_topics?: string; // Server-only; for topics this section should cover
}

interface ReportFieldsRow {
	id?: string; // GraphQL Cursor, client-side only, but if present in Server, it will be an Array
	key: string; // Key is used to map row/columns to answers
	preset?: ReportRowPresetEnum;
	className?: string;
	isHeader?: boolean;
	columns: Partial<ReportFieldsColumn>[];
}

type ReportRowGQL = Omit<ReportFieldsRow, 'key'> & {
	id: string; // GraphQL Cursor, client-side only, but if present in Server, it will be an Array
};

interface ReportFieldsColumn {
	id: string; // GraphQL Cursor, client-side only, but if present in Server, it will be an Array
	key: string; // Key is used to map column to answers
	className?: string;
	labelClassName?: string;
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
	documentName: string;
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
	documentName: string;
	title: string;
	description: string;
	type: ReportTypeEnum;
	period: string; // YYYY-MM-DD
	evidencesCount: number;
	activityAt: string | null; // ISO date string

	sections?: ReportFieldsSection[];
	rows?: ReportRowGQL[];
}

/**
 * Report submission data
 */

export interface ReportEvidenceGQL {
	__deleted?: boolean;

	id: string; // GraphQL Cursor
	reportSubmissionId: string;
	sectionKey: string;
	log: any; // LogEntryGQL
}

export interface ReportSubmissionGQL {
	__deleted?: boolean;

	id: string;
	reportId: string;
	organizationId: string;
	sectionKey: string;
	documentName: string;
	sectionName: string;
	title: string;
	period: string; // YYYY-MM-DD
	activityAt: string | null; // ISO date string
	rows: ReportRowGQL[];
	evidences: string[];
  requireFileUploads: boolean;
}

export interface ReportLogRelData {
	__table: 'report_log_rels';
	reportSubmissionId: number | bigint;
	logId: number | bigint;
	sectionKey: string;
}

export interface ReportSubmissionData {
	__table: 'report_submissions';
	id: number;
	organizationId: number;
	reportId: number;
	period: Date; // YYYY-MM-DD in database, Date object in server via ORM
	answers: Record<string, any>; // key-value pairs of answers
	logRels?: ReportLogRelData[];
	activityAt: Date;
}

/**
 * Available reports
 */

export interface ReportAvailabilityGQL {
  id: string;
  type: ReportTypeEnum;
  periods: string[]; // YYYY-MM-DD
}
