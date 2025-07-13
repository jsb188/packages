
export const organizationFragment = `fragment organizationFragment on Organization {
  id
  stripeCustomerId
  name
  operation
  dailyDigestTime
  domains

  settings {
    emoji
    timeZone
  }
}`;

export const organizationRelationshipFragment = `fragment organizationRelationshipFragment on OrganizationRelationship {
  id
  primary
  role

  acl {
    id
    billing
    logs
    members
    finances
    products
    settings
    integrations
    digests
  }
}`;
