import { gql } from 'graphql-tag';
import { accountFragment } from '../fragments/accountFragments';
import { actionFragment } from '../fragments/actionFragments';
import { logArableFragment, logEntryFragment, logFarmersMarketFragment, logLivestockFragment } from '../fragments/logFragments';

export const actionsListQry = gql`
query actionsList (
  $organizationId: GenericID!
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  actionsList (
    organizationId: $organizationId
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    ...actionFragment

    logEntry {
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
}

${actionFragment}
${accountFragment}
${logEntryFragment}
${logArableFragment}
${logFarmersMarketFragment}
${logLivestockFragment}
`;
