
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
  organizationId
  parentId
  name
  note
  organizationName
  parentName
}`;

export const organizationChildFragment = `fragment organizationChildFragment on OrganizationChild {
  id
  parentId
  cursor
  addedAt

  preferredContacts {
    department
    name
    emailAddress
    phoneNumber
  }
}`;
