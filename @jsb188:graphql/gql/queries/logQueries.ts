import { gql } from 'graphql-tag';
import { accountFragment } from '../fragments/accountFragments';
import { logEntryFragment, logEntryArableFragment } from '../fragments/logFragments';

export const logEntriesQry = gql`
query logEntries (
  $organizationId: GenericID!
  $filter: LogEntriesFilter!
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  logEntries (
    organizationId: $organizationId
    filter: $filter
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    ...logEntryFragment

    details {
      ...on LogEntryArable {
        ...logEntryArableFragment
      }
    }

    account {
      ...accountFragment
    }
  }
}

${accountFragment}
${logEntryFragment}
${logEntryArableFragment}
`;
