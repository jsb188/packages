
export const logEntryFragment = `fragment logEntryFragment on LogEntry {
  id
  accountId
  organizationId

  date
  createdAt
  updatedAt
}`;

export const logEntryArableFragment = `fragment logEntryArableFragment on LogEntryArable {
  __typename

  id
  type
  activity
  quantity
  unit
  price
  notes

  crop {
    id
    name
  }
}`;
