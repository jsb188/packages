import { REPORT_TYPES } from '../constants/report';

/**
 * Enums
 */

type ReportTypeEnum = typeof REPORT_TYPES[number];

/**
 * Filters
 */

export interface ReportsFilterArgs {
	preset?: '?' | null;
	reportType: ReportTypeEnum;
  period: number;
	query?: string | null;
}

/**
 * Report; sections
 */

interface ReportFieldsSectionData {
  key: string; // Every section must have a unique string UID
  isGroupTitle?: boolean;
  title: string;
  description: string;
}

// interface ReportSectionGQL extends Omit<ReportFieldsData, 'id'> {
interface ReportSectionGQL extends ReportFieldsSectionData {
  // .. put answers here
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

  fields: {
    sections: ReportFieldsSectionData[];
  };
}

export interface ReportGQL {
  __deleted?: boolean;

  id: string;
  organizationId: string;
  title: string;
  description: string;
  type: ReportTypeEnum;
  period: number;
  activityAt: string | null; // ISO date string

  sections: ReportSectionGQL[];
}
