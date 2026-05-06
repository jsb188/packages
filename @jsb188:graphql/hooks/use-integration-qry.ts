import { useQuery } from '@jsb188/graphql/client';
import { integrationConnectionQry, squareSalesTotalsQry } from '../gql/queries/integrationQueries.ts';
import type { UseQueryParams } from '../types.d.ts';

/**
 * Fetch integration connection status for an organization.
 */
export function useIntegrationConnection(
  organizationId: string | null,
  provider: string,
  params: UseQueryParams = {},
) {
  const { data, ...rest } = useQuery(integrationConnectionQry, {
    variables: {
      organizationId,
      provider,
    },
    skip: !organizationId || !provider || params.skip,
    ...params,
  });

  return {
    integrationConnection: data?.integrationConnection,
    ...rest
  };
}

/**
 * Fetch Square sales totals for an organization.
 */
export function useSquareSalesTotals(
  variables: {
    organizationId?: string | null;
    beginTime?: string | null;
    endTime?: string | null;
    locationId?: string | null;
  },
  params: UseQueryParams = {},
) {
  const { data, ...rest } = useQuery(squareSalesTotalsQry, {
    variables,
    skip: !variables.organizationId || !variables.beginTime || !variables.endTime || params.skip,
    ...params,
  });

  return {
    squareSalesTotals: data?.squareSalesTotals,
    ...rest
  };
}
