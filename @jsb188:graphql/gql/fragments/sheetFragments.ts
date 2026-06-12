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
      disableMarkdown
      bold
      italic
      underline
      strikethrough
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


export const sheetCellFragment = `fragment sheetCellFragment on SheetCell {
  id
  organizationId
  sheetId

  rowIndex
  columnIndex
  rawInput
  formulaText
  value
  formulaValue
  textValue
  numberValue
  booleanValue
  dateValue
  datetimeValue
  errorCode
  errorMessage
  computedAt
  revision
  sourceDataTableRowId
  sourceCellKey

  sourceMeta {
    relatedTable
    relatedId
    referenceStatus
    iconName
  }
  style {
    fontSize
    textColor
    fillColor
    disableMarkdown
    bold
    italic
    underline
    strikethrough
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
    disableMarkdown
    bold
    italic
    underline
    strikethrough
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
    includeRowIds
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


export const sheetViewFragment = `fragment sheetViewFragment on SheetView {
  id
  cellsRevision

  pageInfo {
    hasMoreRows
    lastContentRowIndex
  }

  regions {
    ...sheetRegionFragment
  }
}`;
