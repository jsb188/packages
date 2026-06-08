import { useQuery, useReactiveFragment } from '@jsb188/graphql/client';
import type { InboundEmailsSortEnum } from '@jsb188/mday/types/email.d.ts';
import { inboundEmailQry, inboundEmailsQry } from '../gql/queries/emailQueries.ts';
import type { PaginationArgs, UseQueryParams } from '../types.d.ts';

/**
 * Constants
 */

const INBOUND_EMAILS_LIMIT = 250;

/**
 * Keep inbound email list filters aligned with the GraphQL input shape.
 */
function normalizeInboundEmailsFilter(filter?: {
  startDate?: string | null;
  endDate?: string | null;
  query?: string | null;
  statuses?: string[] | null;
} | null) {
  return filter
    ? {
      startDate: filter.startDate || null,
      endDate: filter.endDate || null,
      query: filter.query || null,
      statuses: filter.statuses || null,
    }
    : null;
}

/*
 * Fetch one inbound email.
 */

export function useInboundEmail(
  variables: {
    organizationId?: string | null;
    inboundEmailId?: string | null;
  },
  params: UseQueryParams = {},
) {
  const cachedInboundEmail = useReactiveInboundEmailFragment(
    variables.inboundEmailId || '',
    null,
  );
  const shouldFetchInboundEmail = !!variables.organizationId && !!variables.inboundEmailId && !cachedInboundEmail && !params.skip;
  const { data, ...rest } = useQuery(inboundEmailQry, {
    ...params,
    variables,
    skip: !shouldFetchInboundEmail,
  });

  return {
    inboundEmail: cachedInboundEmail || data?.inboundEmail,
    initialLoading: shouldFetchInboundEmail && !data,
    ...rest
  };
}

/**
 * Fetch inbound emails.
 */

export function useInboundEmails(
  variables: PaginationArgs & {
    organizationId?: string | null;
    filter?: {
      startDate?: string | null;
      endDate?: string | null;
      query?: string | null;
      statuses?: string[] | null;
    } | null;
    sort?: InboundEmailsSortEnum | null;
  },
  params: UseQueryParams = {},
) {
  const { data, ...rest } = useQuery(inboundEmailsQry, {
    ...params,
    variables: {
      ...variables,
      filter: normalizeInboundEmailsFilter(variables.filter),
      cursor: null,
      after: true,
      limit: INBOUND_EMAILS_LIMIT
    },
    skip: !variables.organizationId || params.skip,
  });

  return {
    inboundEmails: data?.inboundEmails,
    ...rest
  };
}

/**
 * Get reactive inbound email fragment.
 */

export function useReactiveInboundEmailFragment(inboundEmailId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [
      `$inboundEmailFragment:${inboundEmailId}`,
    ],
    queryCount,
  );
}
