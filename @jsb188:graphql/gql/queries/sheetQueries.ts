import { gql } from 'graphql-tag';
import {
	sheetCellFragment,
	sheetFormulaReferenceFragment,
	sheetFragment,
	sheetGridFragment,
	sheetRangeFragment,
	sheetRegionFragment,
} from '../fragments/sheetFragments.ts';

export const sheetsQry = gql`
query sheets (
  $organizationId: GenericID!
  $filter: SheetsFilter
  $sort: WorkspaceItemSort
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  sheets (
    organizationId: $organizationId
    filter: $filter
    sort: $sort
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    ...sheetFragment
  }
}

${sheetFragment}
`;

export const sheetQry = gql`
query sheet (
  $organizationId: GenericID!
  $sheetId: GenericID!
) {
  sheet (
    organizationId: $organizationId
    sheetId: $sheetId
  ) {
    ...sheetFragment
  }
}

${sheetFragment}
`;

export const sheetGridQry = gql`
query sheetGrid (
  $organizationId: GenericID!
  $sheetId: GenericID!
  $viewport: SheetGridViewportInput!
) {
  sheetGrid (
    organizationId: $organizationId
    sheetId: $sheetId
    viewport: $viewport
  ) {
    ...sheetGridFragment

    cells {
      ...sheetCellFragment

      formula {
        references {
          ...sheetFormulaReferenceFragment
        }
      }
    }

    ranges {
      ...sheetRangeFragment
    }
  }
}

${sheetGridFragment}
${sheetCellFragment}
${sheetFormulaReferenceFragment}
${sheetRangeFragment}
${sheetRegionFragment}
`;

export const sheetFormulaReferencesQry = gql`
query sheetFormulaReferences (
  $organizationId: GenericID!
  $sheetId: GenericID!
  $references: [SheetFormulaReferenceInput!]!
) {
  sheetFormulaReferences (
    organizationId: $organizationId
    sheetId: $sheetId
    references: $references
  ) {
    ...sheetFormulaReferenceFragment

    cells {
      ...sheetCellFragment

      formula {
        references {
          ...sheetFormulaReferenceFragment
        }
      }
    }
  }
}

${sheetFormulaReferenceFragment}
${sheetCellFragment}
`;
