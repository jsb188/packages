import { gql } from 'graphql-tag';
import { sheetCellFragment } from '../fragments/sheetFragments.ts';

export const editSheetCellMtn = gql`
mutation editSheetCell (
  $organizationId: GenericID!
  $sheetId: GenericID!
  $sheetRowId: GenericID!
  $cellKey: String!
  $value: String
) {
  editSheetCell (
    organizationId: $organizationId
    sheetId: $sheetId
    sheetRowId: $sheetRowId
    cellKey: $cellKey
    value: $value
  ) {
    ...sheetCellFragment
  }
}

${sheetCellFragment}
`;
