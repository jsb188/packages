import { gql } from 'graphql-tag';
import {
	sheetCellFragment,
	sheetFragment,
	sheetRangeFragment,
	sheetRegionFragment,
	sheetViewFragment,
} from '../fragments/sheetFragments.ts';

export const sheetsQry = gql`
query sheets (
  $organizationId: GenericID!
  $filter: SheetsFilter
  $sort: GridItemSort
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


// NOTE: sheetView is the single-round-trip read for the redesigned sheet data
// layer: cells arrive with final server-computed values (including
// materialized region cells), so no second-phase formula reference resolution
// or client-side region cell synthesis is needed.

export const sheetViewQry = gql`
query sheetView (
  $organizationId: GenericID!
  $sheetId: GenericID!
  $viewport: SheetGridViewportInput!
) {
  sheetView (
    organizationId: $organizationId
    sheetId: $sheetId
    viewport: $viewport
  ) {
    ...sheetViewFragment

    sheet {
      ...sheetFragment
    }

    cells {
      ...sheetCellFragment
    }

    ranges {
      ...sheetRangeFragment
    }
  }
}

${sheetViewFragment}
${sheetFragment}
${sheetCellFragment}
${sheetRangeFragment}
${sheetRegionFragment}
`;
