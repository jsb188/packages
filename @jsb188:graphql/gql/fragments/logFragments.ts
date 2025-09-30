
export const logEntryFragment = `fragment logEntryFragment on LogEntry {
  id
  accountId
  organizationId
  cursor
  date
  createdAt
  updatedAt
}`;

export const logArableFragment = `fragment logArableFragment on LogArable {
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

export const logFarmersMarketFragment = `fragment logFarmersMarketFragment on LogFarmersMarket {
  __typename

  id
  type
  activity

  childOrgId
  childOrganizationName
  notes

  voided
  values {
    label
    value
  }
}`;

export const logLivestockFragment = `fragment logLivestockFragment on LogLivestock {
  __typename

  id
  type
  activity

  livestock
  livestockIdentifiers
  livestockGroups
  item
	quantity
	unit
  price
  notes
}`;
