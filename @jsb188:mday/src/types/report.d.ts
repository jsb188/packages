import { REPORT_FREQUENCY_ENUMS, REPORT_ROW_PRESETS, REPORT_SORT_OPTS, REPORT_STATUS_ENUMS } from '../constants/report.ts';
import type { OrganizationSiteData } from './organization.d.ts';
import type { StorageData, StorageGQL } from './storage.d.ts';

/**
 * Enums
 */

export type ReportRowPresetEnum = typeof REPORT_ROW_PRESETS[number];
export type ReportsSortEnum = typeof REPORT_SORT_OPTS[number];
export type ReportFrequencyEnum = typeof REPORT_FREQUENCY_ENUMS[number];
export type ReportSubmissionStatusEnum = typeof REPORT_STATUS_ENUMS[number];

/**
 * Filters
 */

export interface ReportsFilterArgs {
	preset?: '?' | null;
	reportGroupId?: string | null;
	startPeriod?: string | null; // YYYY-MM-DD
	endPeriod?: string | null; // YYYY-MM-DD
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
	aside?: ReportFieldsAsideItem[];
	sections?: ReportFieldsSection[];
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
	title?: string;
	description?: string;
	rows?: ReportFieldsRow[];
	requireFileUploads?: boolean;
	files?: StorageData[];

	__prompt_section?: string; // Server-only; full prompt for this section - this is the only prompt that allows {{variable}} regex
	__prompt_examples?: string; // Server-only; for examples of what the output should be
	__prompt_topics?: string; // Server-only; for topics this section should cover
}

export interface ReportFieldsAsideItem {
	className?: string;
	label: string;
	text: string;
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
	iconName?: string;
	labelClassName?: string;
	label?: string; // Typically, this is the "question" the AI Agent/human must answer
	text?: string; // This the answer provided by the AI Agent/human
	hint?: string; // Additional instructions or context for this column, typically only shown to AI Agents for more guidance.
	note?: string; // Additional notes in relation to the user's answer for this column
	placeholder?: string | null;
	checked?: boolean | null;
	options?: string[]; // If set, user provided inputs *must* be one of these options (ie. for dropdowns, radios, etc.)
	__allowMultiples?: boolean; // If true, multiple selections are allowed (for options[])
	__notAutomated?: boolean; // If true, this column is not filled during automation
  __doNotAllowNotes?: boolean; // If true, AI will NOT leave notes for this column
}

export interface ReportColumnGQL extends ReportFieldsColumn {
	id: string; // GraphQL Cursor, client-side only, but if present in Server, it will be an Array
	lineNumber?: string | null;
}

export type ReportRowGQL = Omit<ReportFieldsRow, 'key' | 'columns'> & {
	id: string; // GraphQL Cursor, client-side only, but if present in Server, it will be an Array
	columns?: ReportColumnGQL[] | null;
};

export interface ReportGroupLayoutObj {
	columns: string[];
	headers: string[];
	gridLayoutStyle: string;
}

/**
 * Report data
 */

export interface ReportGroupData {
	__table: 'report_groups';
	id: number;
	name: string;
	shortName?: string | null;
	layout?: Partial<ReportGroupLayoutObj> | null;
}

export interface ReportData {
	__table: 'reports';

	id: number;
	reportGroupId: number;
	reportGroup?: ReportGroupData | null;
	documentName: string;
	title: string;
	description: string;
	frequency: ReportFrequencyEnum;
	order: number;

	fields: ReportFieldsObj;
	submission?: ReportSubmissionData | null; // Present when report_submissions was joined onto the report row.

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
	frequency?: ReportFrequencyEnum | null;
	reportGroupId: string;
	groupName: string;
	groupShortName?: string | null;
	period: string; // YYYY-MM-DD
	submission?: ReportSubmissionGQL | null;
	gridLayoutStyle?: string | null;

	aside?: ReportFieldsAsideItem[];
	sections?: ReportSectionGQL[];
}

export interface ReportSectionGQL {
	id: string;
	isGroupTitle?: boolean;
	sectionKey: string;
	title?: string | null;
	description?: string | null;
	rows?: ReportRowGQL[];
	requireFileUploads?: boolean;
	files?: StorageGQL[];
}

export interface ReportSubmissionGQL {
	__deleted?: boolean;

	id: string;
	reportId: string;
	frequency: ReportFrequencyEnum;
	reportSubmissionIdEnc?: string | null;
	organizationId: string;
	organizationIdEnc?: string | null;
	location?: string | null;
	childOrgId: string | null;
	childOrgIdEnc?: string | null;
	childOrgName: string | null;
	childOrgOperation: string | null;
	organizationName?: string | null;
	organizationOperation?: string | null;
	reportGroupId: string;
	groupName: string;
	groupShortName?: string | null;
	period: string; // YYYY-MM-DD
	status: ReportSubmissionStatusEnum | null;
	activityAt: string | null; // ISO date string
	createdAt: string | null; // ISO date string
	updatedAt: string | null; // ISO date string
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
	childOrgId?: number | bigint | null;
	siteId?: number | bigint | null;
	report?: Pick<ReportData, 'id' | 'frequency'> | null;
	site?: Pick<OrganizationSiteData, 'id' | 'name'> | null;
	childOrg?: {
		id: number | bigint;
		name: string;
		operation?: string | null;
	} | null;
	organizationId: number;
	reportId: number;
	period: Date; // YYYY-MM-DD in database, Date object in server via ORM
	answers: Record<string, any>; // key-value pairs of answers
	status?: ReportSubmissionStatusEnum | null;
	storageRels?: ReportStorageRelData[];
	activityAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Report groups
 */

export interface ReportGroupGQL {
	id: string;
	name: string;
	shortName?: string | null;
	layout?: Partial<ReportGroupLayoutObj> | null;
	lastSubmissionPeriod?: string | null; // YYYY-MM-DD
	lastSubmissionReportId?: string | null;
}
