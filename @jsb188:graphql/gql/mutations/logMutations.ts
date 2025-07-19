import { gql } from 'graphql-tag';
import { logEntryFragment, logEntryArableFragment } from '../fragments/logFragments';

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
    }
  }
}

${logEntryFragment}
${logEntryArableFragment}
`;
