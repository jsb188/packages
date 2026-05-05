import { useQuery } from '@jsb188/graphql/client';
import { squareConnectionQry, squareSalesTotalsQry } from '../gql/queries/integrationQueries';
import type { UseQueryParams } from '../types.d';

/**
 * Fetch Square connection status for an organization.
 */
export function useSquareConnection(
  organizationId: string | null,
  params: UseQueryParams = {},
) {
  const { data, ...rest } = useQuery(squareConnectionQry, {
    variables: {
      organizationId,
    },
    skip: !organizationId || params.skip,
    ...params,
  });

  return {
    squareConnection: data?.squareConnection,
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
