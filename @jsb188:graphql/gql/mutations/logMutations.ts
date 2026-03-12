import { gql } from 'graphql-tag';
import {
  logEntryFragment,
  logArableFragment,
  logFarmersMarketFragment,
  logGrowerNetworkFragment,
  logLivestockFragment
} from '../fragments/logFragments';

export const editLogEntryMtn = gql`
mutation editLogEntry (
  $organizationId: GenericID!
  $logEntryId: GenericID!
  $accountId: GenericID
  $date: DateTime
  $flagColor: String

  $arableDetails: LogArableInput
  $growerNetworkDetails: GrowerNetworkInput
  $livestockDetails: LogLivestockInput
  $farmersMarketDetails: LogFarmersMarketInput
) {
  editLogEntry (
    organizationId: $organizationId
    logEntryId: $logEntryId
    accountId: $accountId
    date: $date
    flagColor: $flagColor

    arableDetails: $arableDetails
    growerNetworkDetails: $growerNetworkDetails
    livestockDetails: $livestockDetails
    farmersMarketDetails: $farmersMarketDetails
  ) {
    ...logEntryFragment

    details {
      ...on LogArable {
        ...logArableFragment
      }
      ...on LogFarmersMarket {
        ...logFarmersMarketFragment
      }
      ...on LogGrowerNetwork {
        ...logGrowerNetworkFragment
      }
      ...on LogLivestock {
        ...logLivestockFragment
      }
    }
  }
}

${logEntryFragment}
${logArableFragment}
${logFarmersMarketFragment}
${logGrowerNetworkFragment}
${logLivestockFragment}
`;

export const deleteLogEntryMtn = gql`
mutation deleteLogEntry (
  $organizationId: GenericID!
  $logEntryId: GenericID!
) {
  deleteLogEntry (
    organizationId: $organizationId
    logEntryId: $logEntryId
  )
}
`;
