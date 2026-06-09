export const dataTableFragment = `fragment dataTableFragment on DataTable {
  id
  cursor
  organizationId

  name
  title
  description
  active
  deletedAt

  design {
    id
    instructions
    cellsOrder
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
  }

  createdAt
  updatedAt
}`;

export const dataTablePartialFragment = `fragment dataTablePartialFragment on DataTable {
  id
  name
  title
  description
  deletedAt
}`;

export const dataTableRowFragment = `fragment dataTableRowFragment on DataTableRow {
  id
  cursor
  organizationId
  dataTableId

  identifier
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
