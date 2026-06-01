export const dataTableFragment = `fragment dataTableFragment on DataTable {
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
      format
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
            table
            path
            sourceCellKey
            sourceCellKeys
            operation
          }
        }

        generator {
          keyPrefix

          dateSeries {
            key
            label
            sourceCellKey
            grain
            weekStart

            range {
              type
              start
              end
            }
          }

          dimensions {
            key
            label

            source {
              type
              cellKey

              values {
                value
                label
              }
            }
          }

          measures {
            key
            label
            operation
            sourceCellKey
          }
        }
      }

      columns {
        key
        label
        humanLabel
        iconName
        fieldType
        humanFieldType
        openLink
        humansCannotEdit
        width

        source {
          type
          cellKey
          formulaKey
          dimensionKey
          table
          path
          sourceCellKey
          sourceCellKeys
          operation
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

export const dataTableRowFragment = `fragment dataTableRowFragment on DataTableRow {
  id
  cursor
  organizationId
  dataTableId

  identifier
  viewId
  viewRowKey
  position
  metadata
}`;

export const dataTableCellFragment = `fragment dataTableCellFragment on DataTableCell {
  id
  dataTableId
  dataTableRowId

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
  reference {
    dataTableId
    dataTableRowId
    cellKey
  }
  referenceStatus

  createdAt
  updatedAt
}`;
