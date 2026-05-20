import { gql } from 'graphql-tag';
import { sheetCellFragment, sheetFragment } from '../fragments/sheetFragments.ts';

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

export const editSheetDesignMtn = gql`
mutation editSheetDesign (
  $organizationId: GenericID!
  $sheetId: GenericID!
  $design: SheetDesignPatchInput!
) {
  editSheetDesign (
    organizationId: $organizationId
    sheetId: $sheetId
    design: $design
  ) {
    ...sheetFragment
  }
}

${sheetFragment}
`;
