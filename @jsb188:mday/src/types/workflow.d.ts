import type { LogActionStatusEnum, LogTypeEnum } from '../types/log.d.ts';
import type { OrganizationFeatureEnum } from '../types/organization.d.ts';

/**
 * Workflow data object
 */

export interface WorkflowData {
	__table: 'workflows';

	id: number | bigint;
	organizationId: number | bigint;
  org?: OrganizationData; // Included if query joined with organization table

	logType: LogTypeEnum;
	feature?: OrganizationFeatureEnum;

	title: string;
	instructions: string;

	schedule: string | null;
	active: boolean;
	values: Partial<{
    steps: LabelAndValue[];
		config: Record<string, string>; // Frequent values include: "endTime"
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
	runKey: string;
	values: null | Partial<{
    progressSummary: string;
		config: Record<string, string>; // Frequent values include: "endTime"
  }>;
	message: string | null;
	startedAt: Date | null;
	endActivityAt: Date | null;
	status: LogActionStatusEnum;
	scheduledDate: Date;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Workflow GraphQL data
 */

export interface WorkflowGQL {
	__deleted?: boolean;

	id: string;
	organizationId: string;

	logType: LogTypeEnum;
	feature: OrganizationFeatureEnum | null;

	title: string;
	instructions: string;
  steps: LabelAndValue[];

	schedule: string | null;
	active: boolean;

	startedAt: string | null;
	nextAt: string | null;
	createdAt: string;
	updatedAt: string;
}
