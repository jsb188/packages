import { useQuery, useReactiveFragment } from '@jsb188/graphql/client';
import { childOrganizationsQry, myOrganizationsQry, organizationMembersQry, organizationWorkflowsQry } from '../gql/queries/organizationQueries';
import type { PaginationArgs, UseQueryParams } from '../types.d';
import type { OrganizationOperationEnum } from '@jsb188/mday/types/organization.d.ts';

const ORG_CHILDREN_LIMIT = 250;

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
 * Fetch organization members
 */

export function useOrganizationMembers(
  organizationId: string | null,
  paramsOrShowGuests: UseQueryParams | boolean = {},
  showGuests_: boolean = false,
) {
  const params = typeof paramsOrShowGuests === 'boolean' ? {} : paramsOrShowGuests;
  const showGuests = typeof paramsOrShowGuests === 'boolean' ? paramsOrShowGuests : showGuests_;

  const { data, ...rest } = useQuery(organizationMembersQry, {
    variables: {
      organizationId,
      showGuests,
    },
    skip: !organizationId || params.skip,
    ...params,
  });

  return {
    organizationMembers: data?.organizationMembers,
    ...rest
  };
}

/**
 * Get reactive organization fragment
 */

export function useReactiveOrganizationWorkflowFragment(workflowId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [`$organizationInstructionsFragment:${workflowId}`],
    queryCount,
  );
}

/**
 * Get reactive organization fragment
 */

export function useReactiveOrganization(orgId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [`$organizationFragment:${orgId}`],
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

  const orgRel = myOrganizations?.find((orgRel: any) => orgRel.organization?.id === organizationId) || null;
  const organization = useReactiveOrganization(orgRel?.organization?.id, orgRel?.organization);

  return {
    organizationRelationship: orgRel,
    organization,
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

export function useReactiveOrganizationChildFragment(childId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [
      `$organizationChildFragment:${childId}`,
      // [`$organizationChildArableFragment:${childId}`, null],
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
