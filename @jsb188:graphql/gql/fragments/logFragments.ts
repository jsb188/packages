
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

  item
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

  summary
  notes
}`;

export const logFarmersMarketFragment = `fragment logFarmersMarketFragment on LogFarmersMarket {
  __typename

  id
  type
  activity

  childOrgId
  childOrganizationName

  item

  otherParty
  referenceNumber
  values {
    label
    value
    quantity
  }
  tax
  voided

  summary
  notes
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

  summary
  notes
}`;
