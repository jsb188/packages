import { gql } from 'graphql-tag';
import { accountFragment } from '../fragments/accountFragments';
import { logEntryFragment, logArableFragment, logLivestockFragment, logFarmersMarketFragment } from '../fragments/logFragments';

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
      ...on LogArable {
        ...logArableFragment
      }
      ...on LogFarmersMarket {
        ...logFarmersMarketFragment
      }
      ...on LogLivestock {
        ...logLivestockFragment
      }
    }

    account {
      ...accountFragment
    }
  }
}

${accountFragment}
${logEntryFragment}
${logArableFragment}
${logFarmersMarketFragment}
${logLivestockFragment}
`;
