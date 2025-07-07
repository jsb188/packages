
export const organizationFragment = `fragment organizationFragment on Organization {
  id
  stripeCustomerId
  operation
  name
  emoji
  domains
}`;

export const organizationRelationshipFragment = `fragment organizationRelationshipFragment on OrganizationRelationship {
  id
  primary
  role

  acl {
    id
    billing
    journal
    members
    finances
    products
    settings
    integrations
  }
}`;
