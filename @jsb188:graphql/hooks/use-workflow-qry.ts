import { useQuery, useReactiveFragment } from '@jsb188/graphql/client';
import { workflowRunsQry, workflowsQry } from '../gql/queries/workflowQueries';
import type { UseQueryParams } from '../types.d';

/**
 * Fetch workflows for an organization
 */

export function useWorkflows(organizationId?: string | null, params: UseQueryParams = {}) {
  const { data, ...rest } = useQuery(workflowsQry, {
    variables: {
      organizationId,
    },
    skip: !organizationId,
    ...params,
  });

  return {
    workflows: data?.workflows,
    ...rest
  };
}

/**
 * Fetch runs for a workflow
 */

export function useWorkflowRuns(workflowId?: string | null, params: UseQueryParams = {}) {
  const { data, ...rest } = useQuery(workflowRunsQry, {
    variables: {
      workflowId,
    },
    skip: !workflowId,
    ...params,
  });

  return {
    workflowRuns: data?.workflowRuns,
    ...rest
  };
}

/**
 * Get reactive workflow fragment
 */

export function useReactiveWorkflowFragment(workflowId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [`$workflowFragment:${workflowId}`],
    queryCount,
  );
}
