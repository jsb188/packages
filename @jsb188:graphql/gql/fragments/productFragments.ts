
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
  name

  schedule {
    frequency
    interval
    daysOfWeek
    time
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
}`;

export const productAttendanceFragment = `fragment productAttendanceFragment on ProductAttendance {
  id
  productId
  attended
  calDate
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
