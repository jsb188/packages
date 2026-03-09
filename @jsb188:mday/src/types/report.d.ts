import { REPORT_SORT_OPTS, REPORT_ROW_PRESETS } from '../constants/report.ts';
import type { StorageData, StorageGQL } from './storage.d.ts';

/**
 * Enums
 */

export type ReportRowPresetEnum = typeof REPORT_ROW_PRESETS[number];
export type ReportsSortEnum = typeof REPORT_SORT_OPTS[number];

/**
 * Filters
 */

export interface ReportsFilterArgs {
	preset?: '?' | null;
	reportGroup: string;
	period: string; // YYYY-MM-DD
	query?: string | null;
}

/**
 * Report; fields
 */

export interface ReportFieldsVariables {
	month?: number; // Used for MONTH presets (required for all preset="MONTH" rows)
	[key: string]: any;
}

export interface ReportFieldsObj {
	__allowMultiples?: boolean; // Allow multiple copies of the same report (from 1 report template)
	__notAutomated?: boolean; // If true, report is not skipped during automation
	__prompt?: string; // Server-only, this prompt used on the entire report as a whole (ie. OSP generation)
	gridLayoutStyle?: string;
	sections?: ReportFieldsSection[];
	rows?: ReportFieldsRow[];
	metadata?: ReportFieldsRow[];
	variables?: ReportFieldsVariables;
}

export interface ReportResolvedFieldsObj extends Omit<ReportFieldsObj, 'variables'> {
	variables: ReportFieldsVariables;
}

export interface ReportFieldsSection {
	id?: string; // GraphQL Cursor, client-side only, but if present in Server, it will be an Array
	key: string; // Every section must have a unique string UID
	isGroupTitle?: boolean;
	sectionKey?: string; // Derived from "key" for client-facing GraphQL data
	sectionName: string;
	title?: string;
	description?: string;
	rows?: ReportFieldsRow[];
	requireFileUploads?: boolean;
	files?: StorageData[];

	__prompt_section?: string; // Server-only; full prompt for this section - this is the only prompt that allows {{variable}} regex
	__prompt_examples?: string; // Server-only; for examples of what the output should be
	__prompt_topics?: string; // Server-only; for topics this section should cover
}

export interface ReportFieldsRow {
	id?: string; // GraphQL Cursor, client-side only, but if present in Server, it will be an Array
	key: string; // Key is used to map row/columns to answers
	preset?: ReportRowPresetEnum;
	className?: string;
	isHeader?: boolean;
	columns: ReportFieldsColumn[];
  __notAutomated?: boolean; // If true, this column is not filled during automation
}

export interface ReportFieldsColumn {
	id?: string; // GraphQL Cursor, client-side only, but if present in Server, it will be an Array
	key?: string; // Key is used to map column to answers
	className?: string;
	labelClassName?: string;
	label?: string;
	text?: string;
  note?: string; // Additional notes in relation to the user's answer for this column
	placeholder?: string | null;
	checked?: boolean | null;
	value?: string | null; // Available only in server; this value has the indexes to map answers to directly without keys
  options?: string[]; // If set, user provided inputs *must* be one of these options (ie. for dropdowns, radios, etc.)
  __allowMultiples?: boolean; // If true, multiple selections are allowed (for options[])
  __notAutomated?: boolean; // If true, this column is not filled during automation
}

export interface ReportColumnGQL extends ReportFieldsColumn {
	id: string; // GraphQL Cursor, client-side only, but if present in Server, it will be an Array
}

export type ReportRowGQL = Omit<ReportFieldsRow, 'key' | 'columns'> & {
	id: string; // GraphQL Cursor, client-side only, but if present in Server, it will be an Array
	columns?: (ReportColumnGQL | null)[] | null;
};

/**
 * Report data
 */

export interface ReportData {
	__table: 'reports';

	id: number;
	reportGroup: string;
	group: string;
	groupTitle: string;
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
	group: string;
	groupTitle: string;
	period: string; // YYYY-MM-DD
	evidencesCount: number;
	gridLayoutStyle?: string | null;
	activityAt: string | null; // ISO date string

	sections?: ReportSectionGQL[];
	rows?: ReportRowGQL[];
}

export interface ReportSectionGQL {
	id: string;
	isGroupTitle?: boolean;
	sectionKey: string;
	sectionName: string;
	title?: string | null;
	description?: string | null;
	rows?: ReportRowGQL[];
	requireFileUploads?: boolean;
	files?: StorageGQL[];
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

export interface ReportStorageRelData {
	__table: 'report_storage_rels';
	reportSubmissionId: number | bigint;
	storageId: number | bigint;
	sectionKey: string;
	order: number;
	file: StorageData;
}

export interface ReportSubmissionData {
	__table: 'report_submissions';
	id: number;
	organizationId: number;
	reportId: number;
	period: Date; // YYYY-MM-DD in database, Date object in server via ORM
	answers: Record<string, any>; // key-value pairs of answers
	logRels?: ReportLogRelData[];
	storageRels?: ReportStorageRelData[];
	activityAt: Date;
}

/**
 * Available reports
 */

export interface ReportAvailabilityGQL {
	id: string;
	group: string;
	groupTitle: string;
	periods: string[]; // YYYY-MM-DD
}
