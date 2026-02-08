import { useQuery } from '@jsb188/graphql/client';
import { workflowsQry } from '../gql/queries/workflowQueries';
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
