import { useQuery, useReactiveFragment } from '@jsb188/graphql/client';
import { workflowRunsQry, workflowsQry } from '../gql/queries/workflowQueries.ts';
import type { PaginationArgs, UseQueryParams } from '../types.d.ts';

/**
 * Constants
 */

const WORKFLOWS_LIST_LIMIT = 250;

/**
 * Fetch workflows for an organization
 */

export function useWorkflows(
  variablesOrOrganizationId?: string | null | (PaginationArgs & {
    organizationId?: string | null;
  }),
  params: UseQueryParams = {},
) {
  const usesPaginationVariables = typeof variablesOrOrganizationId === 'object' && variablesOrOrganizationId !== null;
  const variables = usesPaginationVariables
    ? variablesOrOrganizationId
    : { organizationId: variablesOrOrganizationId };

  const { data, ...rest } = useQuery(workflowsQry, {
    variables: usesPaginationVariables ? {
      ...variables,
      cursor: null,
      after: true,
      limit: WORKFLOWS_LIST_LIMIT,
    } : variables,
    skip: !variables.organizationId,
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
