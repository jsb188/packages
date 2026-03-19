
export const logEntryFragment = `fragment logEntryFragment on LogEntry {
  id
  accountId
  organizationId
  childOrgId
  reportId
  reportSubmissionId
  siteId
  cursor
  status
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

  item
  quantity
  unit
  location

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
  location

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

  notes
}`;
