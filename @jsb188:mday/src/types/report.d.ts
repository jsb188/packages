import { REPORT_TYPES, REPORT_ROW_PRESETS } from '../constants/report';

/**
 * Enums
 */

type ReportTypeEnum = typeof REPORT_TYPES[number];
type ReportRowPresetEnum = typeof REPORT_ROW_PRESETS[number];

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
  sections?: ReportFieldsSection[];
  tables?: ReportFieldsTable[];
}

interface ReportFieldsSection {
  id: string; // GraphQL Cursor, client-side only, but if present in Server, it will be an Array
	key: string; // Every section must have a unique string UID
	isGroupTitle?: boolean;
	title: string;
	description: string;
}

interface ReportFieldsTable {
  headers: ReportFieldsRow;
  rows: ReportFieldsRow[];
}

interface ReportFieldsRow {
  preset?: ReportRowPresetEnum;
  columns: {
    id: string; // GraphQL Cursor, client-side only, but if present in Server, it will be an Array
    text: string;
    value?: string | null;
    width?: string;
  }[];
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
  }
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
  tables?:
}

export interface ReportSubmissionData {
  __table: 'report_submissions';
  id: number;
}
