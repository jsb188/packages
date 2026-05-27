import { useQuery, useReactiveFragment } from '@jsb188/graphql/client';
import type { InboundContactsSortEnum } from '@jsb188/mday/types/inboundContact.d.ts';
import { loadFragment } from '../cache/index.ts';
import { inboundContactQry, inboundContactsQry } from '../gql/queries/inboundContactQueries.ts';
import type { PaginationArgs, UseQueryParams } from '../types.d.ts';

/**
 * Constants
 */

const INBOUND_CONTACTS_LIMIT = 250;

/*
 * Fetch one inbound contact.
 */

export function useInboundContact(
  variables: {
    organizationId?: string | null;
    inboundContactId?: string | null;
  },
  params: UseQueryParams = {},
) {
  const cachedInboundContact = variables.inboundContactId
    ? loadFragment(`$inboundContactFragment:${variables.inboundContactId}`)
    : null;
  const shouldFetchInboundContact = !!variables.organizationId && !!variables.inboundContactId && !cachedInboundContact && !params.skip;
  const { data, ...rest } = useQuery(inboundContactQry, {
    ...params,
    variables,
    skip: !shouldFetchInboundContact,
  });
  const inboundContact = useReactiveInboundContactFragment(
    variables.inboundContactId || '',
    data?.inboundContact || cachedInboundContact,
    rest.updatedCount,
  );

  return {
    inboundContact,
    initialLoading: shouldFetchInboundContact && !data,
    ...rest
  };
}

/**
 * Fetch inbound contacts.
 */

export function useInboundContacts(
  variables: PaginationArgs & {
    organizationId?: string | null;
    filter?: unknown;
    sort?: InboundContactsSortEnum | null;
  },
  params: UseQueryParams = {},
) {
  const { filter: _filter, ...queryVariables } = variables;
  const { data, ...rest } = useQuery(inboundContactsQry, {
    ...params,
    variables: {
      ...queryVariables,
      cursor: null,
      after: true,
      limit: INBOUND_CONTACTS_LIMIT
    },
    skip: !variables.organizationId || params.skip,
  });

  return {
    inboundContacts: data?.inboundContacts,
    ...rest
  };
}

/**
 * Get reactive inbound contact fragment.
 */

export function useReactiveInboundContactFragment(inboundContactId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [
      `$inboundContactFragment:${inboundContactId}`,
    ],
    queryCount,
  );
}
