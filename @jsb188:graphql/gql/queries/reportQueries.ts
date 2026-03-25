import { gql } from 'graphql-tag';
import { reportColumnDataFragment, reportFragment, reportGroupFragment, reportRowDataFragment, reportSectionFragment, reportSubmissionFragment } from '../fragments/reportFragments';
import { storageFileFragment } from '../fragments/storageFragments';

export const reportsQry = gql`
query reports (
  $organizationId: GenericID!
  $filter: ReportsFilter!
  $sort: ReportsSort
) {
  reports (
    organizationId: $organizationId
    filter: $filter
    sort: $sort
  ) {
    ...reportFragment

    submission {
      ...reportSubmissionFragment
    }

    sections {
      ...reportSectionFragment

      files {
        ...storageFileFragment
      }

      rows {
        ...reportRowDataFragment

        columns {
          ...reportColumnDataFragment
        }
      }
    }

  }
}

${reportFragment}
${reportSubmissionFragment}
${reportSectionFragment}
${storageFileFragment}
${reportRowDataFragment}
${reportColumnDataFragment}
`;

export const reportQry = gql`
query report (
  $organizationId: GenericID!
  $reportSourceId: CursorToIDs!
) {
  report (
    organizationId: $organizationId
    reportSourceId: $reportSourceId
  ) {
    ...reportFragment

    aside {
      title

      items {
        className
        label
        text
      }
    }

    submission {
      ...reportSubmissionFragment
    }

    sections {
      ...reportSectionFragment

      files {
        ...storageFileFragment
      }

      rows {
        ...reportRowDataFragment

        columns {
          ...reportColumnDataFragment
        }
      }
    }

  }
}

${reportFragment}
${reportSubmissionFragment}
${reportSectionFragment}
${storageFileFragment}
${reportRowDataFragment}
${reportColumnDataFragment}
`;

export const reportGroupsQry = gql`
query reportGroups (
  $organizationId: GenericID!
) {
  reportGroups (
    organizationId: $organizationId
  ) {
    ...reportGroupFragment
  }
}

${reportGroupFragment}
`;

export const reportSubmissionsQry = gql`
query reportSubmissions (
  $organizationId: GenericID!
  $filter: ReportsFilter!
  $sort: ReportsSort
  $limit: Int!
) {
  reportSubmissions (
    organizationId: $organizationId
    filter: $filter
    sort: $sort
    limit: $limit
  ) {
    ...reportSubmissionFragment
  }
}

${reportSubmissionFragment}
`;
