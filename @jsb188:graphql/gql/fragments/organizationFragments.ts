
export const organizationFragment = `fragment organizationFragment on Organization {
  id
  stripeCustomerId
  name
  operation
  dailyDigestTime
  activated

  settings {
    timeZone
    language
    color
    features
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
