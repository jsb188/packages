import { useQuery } from '@jsb188/graphql/client';
import { updateNoteQry } from '../gql/queries/appQueries';
import type { UseQueryParams } from '../types.d';

/**
 * Fetch update notes
 */

export function useUpdateNote(accountId?: string | null, params: UseQueryParams = {}) {
  const { data, ...other } = useQuery(updateNoteQry, {
    skip: !accountId,
    ...params,
  });

  return {
    updateNote: data?.updateNote,
    ...other
  };
}
