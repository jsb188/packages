
export const logEntryFragment = `fragment logEntryFragment on LogEntry {
  id
  accountId
  organizationId
  cursor
  date
  createdAt
  updatedAt
}`;

export const logEntryArableFragment = `fragment logEntryArableFragment on LogEntryArable {
  __typename

  id
  type
  activity
  concentration
  concentrationUnit
  crop
  quantity
  unit
  price
  notes
}`;

export const logEntryLivestockFragment = `fragment logEntryLivestockFragment on LogEntryLivestock {
  __typename

  id
}`;

export const logEntryFarmersMarketFragment = `fragment logEntryFarmersMarketFragment on LogEntryFarmersMarket {
  __typename

  id
  type
  activity

  childOrgId
  childOrganizationName
  notes

  void
  values {
    label
    value
  }
}`;
