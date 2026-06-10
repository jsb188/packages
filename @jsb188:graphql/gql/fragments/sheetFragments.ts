export const sheetFragment = `fragment sheetFragment on Sheet {
  id
  cursor
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
    defaultCellStyle {
      fontSize
      textColor
      fillColor
      borderTopWidth
      borderTopColor
      borderTopStyle
      borderRightWidth
      borderRightColor
      borderRightStyle
      borderBottomWidth
      borderBottomColor
      borderBottomStyle
      borderLeftWidth
      borderLeftColor
      borderLeftStyle
    }
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

export const sheetFormulaReferenceFragment = `fragment sheetFormulaReferenceFragment on SheetFormulaReference {
  id
  kind
  text
  status
  rowIndex
  columnIndex
  columnLabel
  startRowIndex
  startColumnIndex
  endRowIndex
  endColumnIndex
  dataTableName
  rowIdentifier
  cellKey
  value
  textValue
  numberValue
  booleanValue
  dateValue
  datetimeValue
  error {
    code
    message
  }
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
      id
      kind
      text
      status
      rowIndex
      columnIndex
      columnLabel
      startRowIndex
      startColumnIndex
      endRowIndex
      endColumnIndex
      dataTableName
      rowIdentifier
      cellKey
      value
      textValue
      numberValue
      booleanValue
      dateValue
      datetimeValue
      error {
        code
        message
      }
    }
    error {
      code
      message
    }
  }
  style {
    fontSize
    textColor
    fillColor
    borderTopWidth
    borderTopColor
    borderTopStyle
    borderRightWidth
    borderRightColor
    borderRightStyle
    borderBottomWidth
    borderBottomColor
    borderBottomStyle
    borderLeftWidth
    borderLeftColor
    borderLeftStyle
  }
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
  style {
    fontSize
    textColor
    fillColor
    borderTopWidth
    borderTopColor
    borderTopStyle
    borderRightWidth
    borderRightColor
    borderRightStyle
    borderBottomWidth
    borderBottomColor
    borderBottomStyle
    borderLeftWidth
    borderLeftColor
    borderLeftStyle
  }
  format
  metadata
  active

  createdAt
  updatedAt
}`;

const sheetRegionSourceFilterConditionFields = `
cellKey
operator
textValue
textValues
numberValue
booleanValue
dateValue
datetimeValue`;

/*
 * Return the SheetRegionSourceFilter selection set expanded to the supported nesting depth.
 */
function getSheetRegionSourceFilterSelection(depth: number): string {
	return `
combinator
conditions {
  ${sheetRegionSourceFilterConditionFields}
}
${depth > 1
		? `groups {
  ${getSheetRegionSourceFilterSelection(depth - 1)}
}`
		: ''}`;
}

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
    filter {
      ${getSheetRegionSourceFilterSelection(3)}
    }
    sort {
      cellKey
      direction
    }
  }

  columns {
    kind
    sourceCellKey
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
