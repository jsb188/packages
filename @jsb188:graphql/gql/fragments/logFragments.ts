
export const logEntryFragment = `fragment logEntryFragment on LogEntry {
  id
  accountId
  organizationId
  cursor
  status
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
  fieldLocation

  otherParty
  referenceNumber
  values {
    label
    value
    quantity
  }
  tax

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

  otherParty
  referenceNumber
  values {
    label
    value
    quantity
  }
  tax

  item
	quantity
	unit
  price
  location
  fieldLocation

  notes
}`;
