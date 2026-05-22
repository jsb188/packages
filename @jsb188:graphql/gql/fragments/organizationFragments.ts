
export const organizationFragment = `fragment organizationFragment on Organization {
  id
  stripeCustomerId
  inboundEmail
  name
  commodities
  operation
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
    name
    department
    emailAddress
    phoneNumber
  }
}`;

export const organizationComplianceFragment = `fragment organizationComplianceFragment on OrganizationCompliance {
  id
  documentName
  type
  expirationDate
  createdAt
  updatedAt
}`;

export const organizationRelationshipFragment = `fragment organizationRelationshipFragment on OrganizationRelationship {
  id
  organizationId
  primary
  role
  notes

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

export const organizationSiteFragment = `fragment organizationSiteFragment on OrganizationSite {
  id
  readableId
  organizationId
  parentId
  name
  region
  note
  createdAt
  organizationName
  parentName
}`;

export const organizationChildFragment = `fragment organizationChildFragment on OrganizationChild {
  id
  parentId
  cursor
  addedAt
  affiliated
  memory

  preferredContacts {
    department
    name
    emailAddress
    phoneNumber
  }
}`;
