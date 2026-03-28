
export const logEntryFragment = `fragment logEntryFragment on LogEntry {
  id
  cursor
  accountId
  organizationId
  childOrgId
  childOrgName
  reportId
  reportSubmissionId
  siteId
  location
  status
  summary
  flagColor
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
  fieldLocation

  item
  quantity
  unit

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

  notes
}`;

export const logGrowerNetworkFragment = `fragment logGrowerNetworkFragment on LogGrowerNetwork {
  __typename

  id
  type
  activity

  otherParty

  item
  fieldLocation

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
  fieldLocation

  notes
}`;
