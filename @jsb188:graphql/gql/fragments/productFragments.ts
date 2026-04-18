
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

export const productCalEventFragment = `fragment productCalEventFragment on ProductCalEvent {
  __typename

  id
  name

  schedule {
    frequency
    weeksOfMonth
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
