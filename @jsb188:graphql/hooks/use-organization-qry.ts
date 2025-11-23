import { useQuery, useReactiveFragment } from '@jsb188/graphql/client';
import { childOrganizationsQry, myOrganizationsQry, organizationWorkflowsQry } from '../gql/queries/organizationQueries';
import type { PaginationArgs, UseQueryParams } from '../types.d';
import type { OrganizationOperationEnum } from '@jsb188/app/types/organization.d';

const ORG_CHILDREN_LIMIT = 100;

/**
 * Fetch organization relationship
 * // NOTE: This is deprecated in favor of useMyOrganizations()
 */

// export function useOrganizationRelationship(organizationId?: string | null, params: UseQueryParams = {}) {
//   const { data, ...rest } = useQuery(organizationRelationshipQry, {
//     variables: {
//       organizationId
//     },
//     skip: !organizationId,
//     ...params,
//   });

//   return {
//     organizationRelationship: data?.organizationRelationship,
//     ...rest
//   };
// }

/**
 * Fetch my organizations
 */

export function useMyOrganizations(params: UseQueryParams = {}) {
  const { data, ...rest } = useQuery(myOrganizationsQry, params);

  return {
    myOrganizations: data?.myOrganizations,
    ...rest
  };
}

/**
 * Fetch organization workflows
 */

export function useOrganizationWorkflows(organizationId: string | null, operation: OrganizationOperationEnum | null) {
  const { data, ...rest } = useQuery(organizationWorkflowsQry, {
    variables: {
      organizationId,
      operation,
    },
    skip: !organizationId || !operation,
  });

  return {
    organizationWorkflows: data?.organizationWorkflows,
    ...rest
  };
}
/**
 * Get reactive organization fragment
 */

export function useReactiveOrganizationWorkflowFragment(workflowId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [
      `$organizationInstructionsFragment:${workflowId}`,
      // [`$organizationChildArableFragment:${organizationId}`, null],
      // By having the second paramter as null, we only observe the reactive changes without setting the data
      // [`$logArableFragment:${logEntryId}`, null],
    ],
    queryCount,
  );
}


/**
 * Fetch my organizations and then get one by ID
 */

export function useOrgRelFromMyOrganizations(organizationId: string | null) {
  const { myOrganizations, ...rest } = useMyOrganizations({
    skip: !organizationId,
  });

  const organizationRelationship = myOrganizations?.find((orgRel: any) => orgRel.organization?.id === organizationId) || null;
  return {
    organizationRelationship,
    myOrganizations,
    ...rest
  };
}

/**
 * Fetch child organizations
 */

export function useChildOrganizations(variables: PaginationArgs & {
  organizationId?: string | null;
  // filters: ? not ready yet
}, params: UseQueryParams = {}) {
  const { data, ...rest } = useQuery(childOrganizationsQry, {
    variables: {
      ...variables,
      cursor: null,
      after: true,
      limit: ORG_CHILDREN_LIMIT
    },
    skip: !variables.organizationId,
    ...params,
  });

  return {
    childOrganizations: data?.childOrganizations,
    ...rest
  };
}

/**
 * Get reactive organization fragment
 */

export function useReactiveOrganizationChildFragment(organizationId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [
      `$organizationChildFragment:${organizationId}`,
      // [`$organizationChildArableFragment:${organizationId}`, null],
      // By having the second paramter as null, we only observe the reactive changes without setting the data
      // [`$logArableFragment:${logEntryId}`, null],
    ],
    queryCount,
  );
}

/**
 * Get reactive organization compliance document fragment
 */

export function useReactiveOrganizationComplianceFragment(complianceId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [
      `$organizationComplianceFragment:${complianceId}`,
      // [`$organizationChildArableFragment:${organizationId}`, null],
      // By having the second paramter as null, we only observe the reactive changes without setting the data
      // [`$logArableFragment:${logEntryId}`, null],
    ],
    queryCount,
  );
}
