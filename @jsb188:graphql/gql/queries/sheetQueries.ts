import { gql } from 'graphql-tag';
import { sheetCellFragment, sheetFragment, sheetRowFragment } from '../fragments/sheetFragments.ts';

export const sheetsQry = gql`
query sheets (
  $organizationId: GenericID!
  $active: Boolean
) {
  sheets (
    organizationId: $organizationId
    active: $active
  ) {
    ...sheetFragment
  }
}

${sheetFragment}
`;

export const sheetRowsQry = gql`
query sheetRows (
  $sheetId: GenericID!
  $organizationId: GenericID!
  $cursor: Cursor
  $limit: Int!
  $filter: SheetRowsFilterInput
) {
  sheetRows (
    sheetId: $sheetId
    organizationId: $organizationId
    cursor: $cursor
    limit: $limit
    filter: $filter
  ) {
    ...sheetRowFragment

    cells {
      ...sheetCellFragment
    }
  }
}

${sheetRowFragment}
${sheetCellFragment}
`;
