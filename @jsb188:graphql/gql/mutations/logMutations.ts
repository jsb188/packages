import { gql } from 'graphql-tag';
import { logEntryFragment, logArableFragment, logLivestockFragment, logFarmersMarketFragment } from '../fragments/logFragments';

export const editLogEntryMtn = gql`
mutation editLogEntry (
  $logEntryId: GenericID!
  $accountId: GenericID
  $date: DateTime

  $arableDetails: LogArableInput
  $livestockDetails: LogLivestockInput
  $farmersMarketDetails: LogFarmersMarketInput
) {
  editLogEntry (
    logEntryId: $logEntryId
    accountId: $accountId
    date: $date

    arableDetails: $arableDetails
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
      ...on LogLivestock {
        ...logLivestockFragment
      }
    }
  }
}

${logEntryFragment}
${logArableFragment}
${logFarmersMarketFragment}
${logLivestockFragment}
`;

export const deleteLogEntryMtn = gql`
mutation deleteLogEntry (
  $logEntryId: GenericID!
) {
  deleteLogEntry (
    logEntryId: $logEntryId
  )
}
`;
