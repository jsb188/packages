import { gql } from 'graphql-tag';
import { accountFragment } from '../fragments/accountFragments.ts';
import {
  logEntryFragment,
  logArableFragment,
  logFarmersMarketFragment,
  logGrowerNetworkFragment,
  logLivestockFragment
} from '../fragments/logFragments.ts';
import { storageFileFragment } from '../fragments/storageFragments.ts';

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

export const logEntryQry = gql`
query logEntry (
  $organizationId: GenericID!
  $logEntryId: GenericID!
) {
  logEntry (
    organizationId: $organizationId
    logEntryId: $logEntryId
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
  $reportSourceId: CursorToIDs!
  $reportSubmissionId: GenericID!
) {
  logEntriesForReport (
    organizationId: $organizationId
    reportSourceId: $reportSourceId
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
