export const sheetFragment = `fragment sheetFragment on Sheet {
  id
  organizationId

  name
  title
  description
  position
  active
  deletedAt

  editor {
    textColors
    fillColors
  }

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
    engine
    text
    references {
      kind
      text
      rowIndex
      columnIndex
      columnLabel
      dataTableName
      rowIdentifier
      cellKey
    }
    error {
      code
      message
    }
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
  }

  columns {
    kind
    sourceCellKey
    label
    width
    formulaText
  }

  options {
    conflictPolicy
    endRowIndex
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

  regions {
    ...sheetRegionFragment
  }
}`;
