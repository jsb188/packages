
export const eventFragment = `fragment eventFragment on Event {
  id
  accountId
	organizationId

  name
  type

  schedule {
    frequency
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
