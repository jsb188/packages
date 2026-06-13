import { gql } from 'graphql-tag';
import { sheetCellFragment, sheetFragment, sheetRangeFragment, sheetRegionFragment } from '../fragments/sheetFragments.ts';

export const createSheetMtn = gql`
mutation createSheet (
  $organizationId: GenericID!
  $title: String!
  $name: String
  $description: String
  $position: Float
  $design: SheetDesignPatchInput
) {
  createSheet (
    organizationId: $organizationId
    title: $title
    name: $name
    description: $description
    position: $position
    design: $design
  )
}
`;

export const updateSheetMtn = gql`
mutation updateSheet (
  $organizationId: GenericID!
  $sheetId: GenericID!
  $title: String
  $name: String
  $description: String
  $position: Float
  $design: SheetDesignPatchInput
  $active: Boolean
) {
  updateSheet (
    organizationId: $organizationId
    sheetId: $sheetId
    title: $title
    name: $name
    description: $description
    position: $position
    design: $design
    active: $active
  ) {
    ...sheetFragment
  }
}

${sheetFragment}
`;

export const deleteSheetMtn = gql`
mutation deleteSheet (
  $organizationId: GenericID!
  $sheetId: GenericID!
) {
  deleteSheet (
    organizationId: $organizationId
    sheetId: $sheetId
  )
}
`;

export const editSheetCellsMtn = gql`
mutation editSheetCells (
  $organizationId: GenericID!
  $sheetId: GenericID!
  $cells: [SheetCellEditInput!]!
  $clientId: String
) {
  editSheetCells (
    organizationId: $organizationId
    sheetId: $sheetId
    cells: $cells
    clientId: $clientId
  ) {
    savedCells {
      ...sheetCellFragment
    }

    recalculatedCells {
      ...sheetCellFragment
    }

    deletedCellCoords {
      rowIndex
      columnIndex
      id
      revision
    }

    cycleCellIds
    cellsRevision
  }
}

${sheetCellFragment}
`;

export const editSheetStructureMtn = gql`
mutation editSheetStructure (
  $organizationId: GenericID!
  $sheetId: GenericID!
  $operation: SheetStructureOperation!
  $index: Int!
  $opId: String
) {
  editSheetStructure (
    organizationId: $organizationId
    sheetId: $sheetId
    operation: $operation
    index: $index
    opId: $opId
  ) {
    ...sheetFragment
  }
}

${sheetFragment}
`;

export const upsertSheetRangeMtn = gql`
mutation upsertSheetRange (
  $organizationId: GenericID!
  $sheetId: GenericID!
  $rangeId: GenericID
  $range: SheetRangeInput!
) {
  upsertSheetRange (
    organizationId: $organizationId
    sheetId: $sheetId
    rangeId: $rangeId
    range: $range
  ) {
    ...sheetRangeFragment
  }
}

${sheetRangeFragment}
`;

export const deleteSheetRangeMtn = gql`
mutation deleteSheetRange (
  $organizationId: GenericID!
  $sheetId: GenericID!
  $rangeId: GenericID!
) {
  deleteSheetRange (
    organizationId: $organizationId
    sheetId: $sheetId
    rangeId: $rangeId
  ) {
    ...sheetRangeFragment
  }
}

${sheetRangeFragment}
`;

export const upsertSheetDataTableRegionMtn = gql`
mutation upsertSheetDataTableRegion (
  $organizationId: GenericID!
  $sheetId: GenericID!
  $regionId: GenericID
  $region: SheetRegionInput!
) {
  upsertSheetDataTableRegion (
    organizationId: $organizationId
    sheetId: $sheetId
    regionId: $regionId
    region: $region
  ) {
    ...sheetRegionFragment
  }
}

${sheetRegionFragment}
`;

export const deleteSheetRegionMtn = gql`
mutation deleteSheetRegion (
  $organizationId: GenericID!
  $sheetId: GenericID!
  $regionId: GenericID!
) {
  deleteSheetRegion (
    organizationId: $organizationId
    sheetId: $sheetId
    regionId: $regionId
  ) {
    ...sheetRegionFragment
  }
}

${sheetRegionFragment}
`;
