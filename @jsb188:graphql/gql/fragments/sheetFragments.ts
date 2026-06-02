export const sheetFragment = `fragment sheetFragment on Sheet {
  id
  organizationId

  name
  title
  description
  position
  active

  design {
    id
    version
    columns
    rows
    defaultCellStyle
    defaultCellFormat
    metadata

    grid {
      rowCount
      columnCount
      frozenRows
      frozenColumns
    }

    namedRanges {
      name
      startRowIndex
      startColumnIndex
      endRowIndex
      endColumnIndex
    }
  }

  createdAt
  updatedAt
}`;

export const sheetCellFragment = `fragment sheetCellFragment on SheetCell {
  id
  organizationId
  sheetId

  rowIndex
  columnIndex
  rawInput
  value
  textValue
  numberValue
  booleanValue
  dateValue
  datetimeValue
  formula {
    version
    kind
    text
    dataTableName
    rowIdentifier
    cellKey
  }
  style
  format
  note
  sourceType
  regionId
  region {
    regionId
    sourceRowId
    sourceCellKey
  }

  createdAt
  updatedAt
}`;

export const sheetRangeFragment = `fragment sheetRangeFragment on SheetRange {
  id
  organizationId
  sheetId

  startRowIndex
  startColumnIndex
  endRowIndex
  endColumnIndex
  position
  style
  format
  metadata
  active

  createdAt
  updatedAt
}`;

export const sheetRegionFragment = `fragment sheetRegionFragment on SheetRegion {
  id
  organizationId
  sheetId

  type
  startRowIndex
  startColumnIndex
  active

  source {
    type
    dataTableId
    viewId
  }

  columns {
    sourceCellKey
    label
    width
  }

  options {
    conflictPolicy
    includeHeaderRow
  }

  createdAt
  updatedAt
}`;

export const sheetGridFragment = `fragment sheetGridFragment on SheetGrid {
  id

  viewport {
    startRowIndex
    startColumnIndex
    rowCount
    columnCount
  }

  rows {
    rowIndex
  }

  pageInfo {
    hasMoreRows
    lastContentRowIndex
  }
}`;
