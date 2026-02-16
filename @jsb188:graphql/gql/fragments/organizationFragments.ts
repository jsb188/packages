
export const organizationFragment = `fragment organizationFragment on Organization {
  id
  stripeCustomerId
  name
  commodities
  operation

  dailyDigestTime
  activated

  address {
    line1
    line2
    city
    state
    postalCode
    country
  }

  features
  settings {
    timeZone
    language
    color
  }

  directory {
    department
    name
    emailAddress
    phoneNumber
  }
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
  organizationId
  primary
  role

  acl {
    id
    billing
    compliance
    digests
    finances
    integrations
    logs
    members
    orgManagement
    products
    settings
    viewData
  }
}`;

export const organizationChildFragment = `fragment organizationChildFragment on OrganizationChild {
  id
  cursor
  addedAt

  preferredContacts {
    department
    name
    emailAddress
    phoneNumber
  }
}`;

export const organizationInstructionsFragment = `fragment organizationInstructionsFragment on OrganizationInstructions {
  id
  organizationId
  logType
  summary
  instructions
  createdAt
  updatedAt
}`;
