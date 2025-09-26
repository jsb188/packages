
export const organizationFragment = `fragment organizationFragment on Organization {
  id
  stripeCustomerId
  name
  operation
  dailyDigestTime
  domains

  settings {
    timeZone
    language
    color
  }
}`;

export const organizationEventFragment = `fragment organizationEventFragment on OrganizationEvent {
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

export const organizationEventAttendanceFragment = `fragment organizationEventAttendanceFragment on OrganizationEventAttendance {
  id
  orgEventId
  attended
  calDate
}`;

export const organizationComplianceFragment = `fragment organizationComplianceFragment on OrganizationCompliance {
  id
  number
  name
  type
  expirationDate
  notes
  createdAt
  updatedAt

  files {
    id
    complianceId
    storageId
    order
    uri
    contentType
  }
}`;

export const organizationRelationshipFragment = `fragment organizationRelationshipFragment on OrganizationRelationship {
  id
  primary
  role

  acl {
    id
    billing
    digests
    logs
    members
    finances
    settings
    integrations
    reminders
    compliance
  }
}`;

export const organizationChildFragment = `fragment organizationChildFragment on OrganizationChild {
  id
  addedAt
}`;
