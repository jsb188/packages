import { gql } from 'graphql-tag';
import { accountFragment } from '../fragments/accountFragments';
import {
  logEntryFragment,
  logArableFragment,
  logFarmersMarketFragment,
  logGrowerNetworkFragment,
  logLivestockFragment
} from '../fragments/logFragments';
import { storageFileFragment } from '../fragments/storageFragments';

export const logEntryFragmentStatement = `...logEntryFragment

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

    account {
      ...accountFragment
    }`;

export const logEntryFragmentImports = `
${accountFragment}
${logEntryFragment}
${logArableFragment}
${logFarmersMarketFragment}
${logGrowerNetworkFragment}
${logLivestockFragment}
`;

export const logEntriesQry = gql`
query logEntries (
  $organizationId: GenericID!
  $filter: LogEntriesFilter!
  $sort: LogEntriesSort
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  logEntries (
    organizationId: $organizationId
    filter: $filter
    sort: $sort
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    ${logEntryFragmentStatement}

    files {
      ...storageFileFragment
    }
  }
}

${storageFileFragment}
${logEntryFragmentImports}
`;

export const logEntriesForReportQry = gql`
query logEntriesForReport (
  $organizationId: GenericID!
  $reportSubmissionId: CursorToIDs!
) {
  logEntriesForReport (
    organizationId: $organizationId
    reportSubmissionId: $reportSubmissionId
  ) {
    ${logEntryFragmentStatement}

    files {
      ...storageFileFragment
    }
  }
}

${storageFileFragment}
${logEntryFragmentImports}
`;
