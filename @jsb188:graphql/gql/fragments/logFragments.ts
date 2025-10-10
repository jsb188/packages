
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
  location
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

  referenceNumber
  voided
  values {
    label
    value
    quantity
  }
}`;

export const logLivestockFragment = `fragment logLivestockFragment on LogLivestock {
  __typename

  id
  type
  activity

  livestock
  livestockIdentifiers
  livestockGroup
  damIdentifier

  vendor
  referenceNumber
  values {
    label
    value
    quantity
  }

  item
	quantity
	unit
  price
  tax
  location
  notes
}`;
