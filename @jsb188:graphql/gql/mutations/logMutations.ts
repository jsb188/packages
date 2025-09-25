import { gql } from 'graphql-tag';
import { logEntryFragment, logEntryArableFragment, logEntryLivestockFragment, logEntryFarmersMarketFragment } from '../fragments/logFragments';

export const editLogEntryMtn = gql`
mutation editLogEntry (
  $logEntryId: GenericID!
  $accountId: GenericID
  $date: DateTime

  $arableDetails: LogEntryArableInput
  $livestockDetails: LogEntryLivestockInput
) {
  editLogEntry (
    logEntryId: $logEntryId
    accountId: $accountId
    date: $date

    arableDetails: $arableDetails
    livestockDetails: $livestockDetails
  ) {
    ...logEntryFragment

    details {
      ...on LogEntryArable {
        ...logEntryArableFragment
      }
      ...on LogEntryLivestock {
        ...logEntryLivestockFragment
      }
      ...on LogEntryFarmersMarket {
        ...logEntryFarmersMarketFragment
      }
    }
  }
}

${logEntryFragment}
${logEntryArableFragment}
${logEntryLivestockFragment}
${logEntryFarmersMarketFragment}
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
