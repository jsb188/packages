import type { LabelAndValue } from '@jsb188/app/types/other.d.ts';
import type { BuildSingleTextLine } from '@jsb188/app/utils/string.ts';
import type { DataTableData, DataTableGQL } from '../types/dataTable.d.ts';
import type { LogTypeEnum } from '../types/log.d.ts';
import type { OrganizationData, OrganizationFeatureEnum } from '../types/organization.d.ts';
import type { WORKFLOW_RUN_STATUS_ENUMS } from '@jsb188/app/constants/agent.ts';

/**
 * Enums
 */

export type WorkflowStatusEnum = (typeof WORKFLOW_RUN_STATUS_ENUMS)[number];

/**
 * Workflow prompt instructions
 */

export interface WorkflowPrompts {
	main: BuildSingleTextLine[];
	identity?: BuildSingleTextLine[];
	progressReport?: BuildSingleTextLine[];
	dataTable?: BuildSingleTextLine[];
	summary?: BuildSingleTextLine[];
}

/**
 * Workflow data; each step object
 */

export interface WorkflowStep extends LabelAndValue {
	conditional?: Partial<LabelAndValue> & {
		required?: string[]; // If this value doesn't exist or is not an array, that's a data error, and this object should be ignored
	};
}

/**
 * Workflow data object
 */

export interface WorkflowData {
	__table: 'workflows';

	id: number | bigint;
	organizationId: number | bigint;
	org?: OrganizationData; // Included if query joined with organization table
	reportId: number | bigint | null;
	dataTables?: Array<Pick<DataTableData, 'id' | 'name' | 'title' | 'description' | 'deletedAt'>>;

	logType: LogTypeEnum;
	feature?: OrganizationFeatureEnum;

	title: string;
	instructions?: null | WorkflowPrompts;

	schedule: string | null;
	scheduleInterval: number;
	active: boolean;
	values: Partial<{
		model: 'advanced' | 'standard' | 'basic' | 'lesser' | 'smallest';
		effort: 'minimal' | 'low' | 'medium' | 'high';
		verbosity: 'low' | 'medium' | 'high';
		steps: WorkflowStep[];
		requireDataTables?: boolean;
		dataTableRowIdentifier?: 'logId' | 'reportSubmissionId' | null;
		config: Record<string, string | number | boolean | null> & {
			endTime: string; // HHMM format
		};
	}>;

	startedAt: Date | null;
	nextAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Workflow instance data object
 */

export interface WorkflowRunData {
	__table: 'workflow_runs';

	id: number | bigint;
	workflowId: number | bigint;
	logId: number | bigint | null;
	reportSubmissionId?: number | bigint | null;
	runKey: string;
	iterations: number;
	values:
		| null
		| Partial<{
			progressReport: string;
		}>;
	message: string | null;
	status: WorkflowStatusEnum;
	scheduledDate: Date | null;
	followUpAt: Date | null;
	activityAt: Date;
}

/**
 * Workflow dataTable target data object
 */

export interface WorkflowDataTableTargetData {
	__table: 'workflow_data_table_targets';

	id: number | bigint;
	workflowId: number | bigint;
	dataTableId: number | bigint;
}

/**
 * Workflow dataTable write receipt data object
 */

export interface WorkflowDataTableRecordWriteData {
	__table: 'workflow_data_table_record_writes';

	id: number | bigint;
	organizationId: number | bigint;
	workflowId: number | bigint;
	workflowRunId?: number | bigint | null;
	logId?: number | bigint | null;
	reportSubmissionId?: number | bigint | null;
	dataTableId: number | bigint;
	dataTableRowId?: number | bigint | null;
	status: 'CREATED' | 'UPDATED' | 'SKIPPED' | 'FAILED';
	error?: string | null;
	metadata: Record<string, any>;
	createdAt: Date;
	updatedAt: Date;
}

export interface WorkflowRunGQL {
	__deleted?: boolean;

	id: string;
	workflowId: string;
	logId: string | null;
	runKey: string;
	iterations: number;
	progressReport: string | null;
	message: string | null;
	status: WorkflowStatusEnum;
	scheduledDate: string | null;
	followUpAt: string | null;
	activityAt: string;
}

/**
 * Workflow GraphQL data
 */

export interface WorkflowGQL {
	__deleted?: boolean;

	id: string;
	organizationId: string;
	reportId: string | null;
	dataTables?: Array<Pick<DataTableGQL, 'id' | 'name' | 'title' | 'description' | 'deletedAt'>>;

	logType: LogTypeEnum;
	feature: OrganizationFeatureEnum | null;

	title: string;
	steps: LabelAndValue[];

	schedule: string | null;
	scheduleInterval: number;
	active: boolean;

	startedAt: string | null;
	nextAt: string | null;
	createdAt: string;
	updatedAt: string;
}
