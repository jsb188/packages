import { useQuery, useReactiveFragment } from '@jsb188/graphql/client';
import { organizationRelationshipQry, myOrganizationsQry, childOrganizationsQry } from '../gql/queries/organizationQueries';
import type { PaginationArgs, UseQueryParams } from '../types.d';

const ORGS_LIMIT = 200;

/**
 * Fetch organization relationship
 */

export function useOrganizationRelationship(organizationId?: string | null, params: UseQueryParams = {}) {
  const { data, ...other } = useQuery(organizationRelationshipQry, {
    variables: {
      organizationId
    },
    skip: !organizationId,
    ...params,
  });

  return {
    organizationRelationship: data?.organizationRelationship,
    ...other
  };
}

/**
 * Fetch my organizations
 */

export function useMyOrganizations(params: UseQueryParams = {}) {
  const { data, ...other } = useQuery(myOrganizationsQry, {
    ...params,
  });

  return {
    myOrganizations: data?.myOrganizations,
    ...other
  };
}

/**
 * Fetch child organizations
 */

export function useChildOrganizations(variables: PaginationArgs & {
  organizationId: string | null;
  // filters: ? not ready yet
}, params: UseQueryParams = {}) {
  const { data, ...other } = useQuery(childOrganizationsQry, {
    variables: {
      ...variables,
      cursor: null,
      after: true,
      limit: ORGS_LIMIT
    },
    skip: !variables.organizationId,
    ...params,
  });

  return {
    childOrganizations: data?.childOrganizations,
    ...other
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
      // [`$logEntryArableFragment:${logEntryId}`, null],
    ],
    queryCount,
  );
}

/**
 * Fetch org events
 */

export function useOrganizationEvents() {
  // organizationEventsQry
}
