
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
  status
  recurring
  startAt
  endAt

	createdAt
	updatedAt
}`;

export const organizationLoadListFragment = `fragment organizationLoadListFragment on OrganizationLoadList {
  id
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
