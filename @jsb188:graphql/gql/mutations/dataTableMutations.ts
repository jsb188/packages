import { gql } from 'graphql-tag';
import { dataTableCellFragment, dataTableFragment, dataTableRowFragment } from '../fragments/dataTableFragments.ts';

export const editDataTableCellMtn = gql`
mutation editDataTableCell (
  $organizationId: GenericID!
  $dataTableId: GenericID!
  $dataTableRowId: GenericID!
  $cellKey: String!
  $viewId: String
  $viewCellKey: String
  $value: String
  $reference: DataTableCellReferenceInput
) {
  editDataTableCell (
    organizationId: $organizationId
    dataTableId: $dataTableId
    dataTableRowId: $dataTableRowId
    cellKey: $cellKey
    viewId: $viewId
    viewCellKey: $viewCellKey
    value: $value
    reference: $reference
  ) {
    ...dataTableCellFragment
  }
}

${dataTableCellFragment}
`;

export const editDataTableCellsMtn = gql`
mutation editDataTableCells (
  $organizationId: GenericID!
  $dataTableId: GenericID!
  $cells: [DataTableCellEditInput!]!
) {
  editDataTableCells (
    organizationId: $organizationId
    dataTableId: $dataTableId
    cells: $cells
  ) {
    ...dataTableCellFragment
  }
}

${dataTableCellFragment}
`;

export const deleteDataTableRowMtn = gql`
mutation deleteDataTableRow (
  $organizationId: GenericID!
  $dataTableId: GenericID!
  $dataTableRowId: GenericID!
) {
  deleteDataTableRow (
    organizationId: $organizationId
    dataTableId: $dataTableId
    dataTableRowId: $dataTableRowId
  ) {
    ...dataTableRowFragment
  }
}

${dataTableRowFragment}
`;

export const editDataTableDesignMtn = gql`
mutation editDataTableDesign (
  $organizationId: GenericID!
  $dataTableId: GenericID!
  $design: DataTableDesignPatchInput!
) {
  editDataTableDesign (
    organizationId: $organizationId
    dataTableId: $dataTableId
    design: $design
  ) {
    ...dataTableFragment
  }
}

${dataTableFragment}
`;
