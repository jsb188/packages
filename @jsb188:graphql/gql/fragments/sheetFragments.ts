export const sheetFragment = `fragment sheetFragment on Sheet {
  id
  organizationId

  name
  title
  description
  active

  design {
    id
    instructions
    cellsOrder
    viewsOrder
    defaultViewId
    humansCannotEdit
    stickyTop
    stickyLeft

    cells {
      key
      label
      humanLabel
      iconName
      fieldType
      humanFieldType
      instructions
      openLink
      humansOnly
      humansCannotEdit
      hidden
      indexed
      width

      source {
        path
        table
      }

      options {
        label
        value
        color
      }
    }

    views {
      id
      name
      layout
      iconName
      color
      description
      columnsOrder
      stickyTop
      stickyLeft
      humansCannotEdit

      rowModel {
        type

        dimensions {
          key
          label

          source {
            type
            cellKey
            formulaKey
            dimensionKey
          }
        }
      }

      columns {
        key
        label
        humanLabel
        iconName
        humanFieldType
        openLink
        humansCannotEdit
        width

        source {
          type
          cellKey
          formulaKey
          dimensionKey
        }

        options {
          label
          value
          color
        }
      }

      filters {
        id
        columnKey
        operator
        value
        enabled
      }

      sorts {
        columnKey
        direction
      }

      groups {
        columnKey
        direction
      }
    }
  }

  createdAt
  updatedAt
}`;

export const sheetRowFragment = `fragment sheetRowFragment on SheetRow {
  id
  cursor
  organizationId
  sheetId

  identifier
  viewId
  viewRowKey
  position
  metadata
}`;

export const sheetCellFragment = `fragment sheetCellFragment on SheetCell {
  id
  sheetId
  sheetRowId

  cellKey
  iconName
  value
  textValue
  numberValue
  booleanValue
  dateValue
  datetimeValue
  relatedTable
  relatedId

  createdAt
  updatedAt
}`;
