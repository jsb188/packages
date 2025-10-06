
export const productFragment = `fragment productFragment on Product {
  id
  organizationId
  cursor

  metadata {
    overview
  }

  createdAt
  updatedAt
}`;

export const productCalendarEventFragment = `fragment productCalendarEventFragment on ProductCalendarEvent {
  __typename

  id
	organizationId

  title
  frequency

  schedule {
    interval
    byDay
    byMonthDay
    byMonth
    time
    time_SU
    time_MO
    time_TU
    time_WE
    time_TH
    time_FR
    time_SA
  }

  address {
    line1
    line2
    city
    state
    postalCode
    country
  }

  startAt
  endAt
	createdAt
	updatedAt
}`;

export const productLivestockFragment = `fragment productLivestockFragment on ProductLivestock {
  __typename

  id
  damIdentifier
  livestockIdentifier
  livestockGroup

  type
  status
  livestockClass

  birthDate
  deathDate
}`;
