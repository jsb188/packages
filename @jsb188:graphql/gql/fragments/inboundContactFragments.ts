export const inboundContactFragment = `fragment inboundContactFragment on InboundContact {
  id
  organizationId
  cursor
  personName
  email
  phone
  memory
  associated {
    organizationId
    name
  }
  createdAt
  updatedAt
}`;
