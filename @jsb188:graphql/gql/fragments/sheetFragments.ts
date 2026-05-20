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
    humansCannotEdit
    stickyTop
    stickyLeft

    cells {
      key
      label
      fieldType
      instructions
      openLink
      humansOnly
      humansCannotEdit
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

export const sheetRowFragment = `fragment sheetRowFragment on SheetRow {
  id
  cursor
  organizationId
  sheetId

  identifier
  position
  metadata
}`;

export const sheetCellFragment = `fragment sheetCellFragment on SheetCell {
  id
  sheetId
  sheetRowId

  cellKey
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
