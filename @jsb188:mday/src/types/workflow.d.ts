import type { LabelAndValue } from '@jsb188/app/types/other.d.ts';
import type { BuildSingleTextLine } from '@jsb188/app/utils/string.ts';
import type { LogActionStatusEnum, LogTypeEnum } from '../types/log.d.ts';
import type { OrganizationData, OrganizationFeatureEnum } from '../types/organization.d.ts';

/**
 * Workflow prompt instructions
 */

export interface WorkflowPrompts {
  main: BuildSingleTextLine[];
  identity?: BuildSingleTextLine[];
  progressReport?: BuildSingleTextLine[];
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
  reportId?: number | null;

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
  status: LogActionStatusEnum;
  scheduledDate: Date | null;
  followUpAt: Date | null;
  activityAt: Date;
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
  status: LogActionStatusEnum;
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
