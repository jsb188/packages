import { gql } from 'graphql-tag';
import { accountFragment } from '../fragments/accountFragments';
import { logEntryFragment, logArableFragment, logLivestockFragment, logFarmersMarketFragment } from '../fragments/logFragments';
import { workflowActionFragment } from '../fragments/workflowFragments';
import { storageFileFragment } from '../fragments/storageFragments';

export const logEntryFragmentStatement = `...logEntryFragment

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
    }`;

export const logEntryFragmentImports = `
${accountFragment}
${logEntryFragment}
${logArableFragment}
${logFarmersMarketFragment}
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

    actions {
      ...workflowActionFragment
    }

    files {
      ...storageFileFragment
    }
  }
}

${workflowActionFragment}
${storageFileFragment}
${logEntryFragmentImports}
`;

export const logEvidencesQry = gql`
query logEvidences (
  $organizationId: GenericID!
  $reportId: CursorToID!
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  logEvidences (
    organizationId: $organizationId
    reportId: $reportId
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    ${logEntryFragmentStatement}

    actions {
      ...workflowActionFragment
    }
  }
}

${workflowActionFragment}
${logEntryFragmentImports}
`;
