import { REPORT_FREQUENCY_ENUMS, REPORT_ROW_PRESETS, REPORT_SORT_OPTS, REPORT_STATUS_ENUMS } from '../constants/report.ts';
import type { OrganizationData, OrganizationSiteData } from './organization.d.ts';
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
	__notAutomated?: boolean; // If true, report is not skipped during automation
	__prompt?: string; // Server-only, this prompt used on the entire report as a whole (ie. OSP generation)
	gridLayoutStyle?: string;
	aside?: ReportFieldsAsideBlock[];
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
	title?: string;
	description?: string;
	rows?: ReportFieldsRow[];
	requireFileUploads?: boolean;
	files?: StorageData[];

	__prompt_section?: string; // Server-only; full prompt for this section - this is the only prompt that allows {{variable}} regex
	__prompt_examples?: string; // Server-only; for examples of what the output should be
	__prompt_topics?: string; // Server-only; for topics this section should cover
}

export interface ReportFieldsAsideBlock {
  title: string;
  nullText?: string;
  items: ReportFieldsAsideItem[];
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
	key: string; // Key is used to map column to answers
	className?: string;
	iconName?: string;
	labelClassName?: string;
	label?: string; // Typically, this is the "question" the AI Agent/human must answer
	answer?: string | null; // GraphQL-facing saved answer value used for realtime updates
	text?: string; // This the answer provided by the AI Agent/human
  confirmationNeeded?: boolean;
  doNotAllowNotes?: boolean; // If true, AI will NOT leave notes for this column
  allowMultipleAnswers?: boolean;
  allowCorrectiveActions?: boolean; // If true, AI Agents are allowed to provide corrective actions for this column if the user adds one
	hint?: string; // Additional instructions or context for this column, typically only shown to AI Agents for more guidance.
	note?: string; // Additional notes in relation to the user's answer for this column
	warningNote?: string; // GraphQL-facing warning field used by mapped report data
	placeholder?: string | null;
	checked?: boolean | null;
	options?: string[]; // If set, user provided inputs *must* be one of these options (ie. for dropdowns, radios, etc.)
	__notAutomated?: boolean; // If true, this column is not filled during automation
}

export interface ReportColumnGQL extends ReportFieldsColumn {
	id: string; // GraphQL Cursor, client-side only, but if present in Server, it will be an Array
	referenceIds?: string[] | null;
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

  site?: Pick<OrganizationSiteData, 'id' | 'name'> | null;
  childOrg?: OrganizationData;
  organization?: OrganizationData;
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
	summary?: string | null;
	submission?: ReportSubmissionGQL | null;
	gridLayoutStyle?: string | null;

	aside?: ReportFieldsAsideBlock[];
	sections?: ReportSectionGQL[];
}

export interface ReportSectionGQL {
	id: string;
	isGroupTitle?: boolean;
	title?: string | null;
	description?: string | null;
	rows?: ReportRowGQL[];
	requireFileUploads?: boolean;
	files?: StorageGQL[];
}

export interface ReportSubmissionGQL {
	__deleted?: boolean;

	id: string;
	reportSubmissionId: string;
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
	childOrg?: OrganizationData;
  organization?: OrganizationData;
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
