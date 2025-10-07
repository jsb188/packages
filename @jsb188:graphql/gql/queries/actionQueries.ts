import { gql } from 'graphql-tag';
import { accountFragment } from '../fragments/accountFragments';
import { logArableFragment, logEntryFragment, logFarmersMarketFragment, logLivestockFragment } from '../fragments/logFragments';
import { organizationFragment } from '../fragments/organizationFragments';
import { actionFragment } from '../fragments/actionFragments';

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

    childOrganization {
      ...organizationFragment
    }

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
${organizationFragment}
${accountFragment}
${logEntryFragment}
${logArableFragment}
${logFarmersMarketFragment}
${logLivestockFragment}
`;
