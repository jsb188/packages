import { useQuery } from '@jsb188/graphql/client';
import { organizationRelationshipQry, myOrganizationsQry } from '../gql/queries/organizationQueries';
import type { UseQueryParams } from '../types.d';

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
