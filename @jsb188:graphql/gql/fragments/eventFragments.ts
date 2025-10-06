
export const eventFragment = `fragment eventFragment on Event {
  id
  accountId
	organizationId

  title
  type

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

  orders {
    id
    eventId
    item
    quantity
    unit
    notes
  }

  startAt
  endAt
	createdAt
	updatedAt
}`;

export const eventAttendanceFragment = `fragment eventAttendanceFragment on EventAttendance {
  id
  eventId
  attended
  calDate
}`;
1