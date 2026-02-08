import type { LogTypeEnum } from '../types/log.d.ts';
import type { OrganizationFeatureEnum } from '../types/organization.d.ts';

/**
 * Workflow data object
 */

export interface WorkflowData {
	__table: 'workflows';

	id: number | bigint;
	organizationId: number | bigint;

	logType: LogTypeEnum;
	feature?: OrganizationFeatureEnum;

	title: string;
	instructions: string;

	schedule: string | null;
	active: boolean;
	config: Record<string, any> | null;

	startedAt: Date | null;
	nextAt: Date | null;
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

	schedule: string | null;
	active: boolean;

	startedAt: string | null;
	nextAt: string | null;
	createdAt: string;
	updatedAt: string;
}
