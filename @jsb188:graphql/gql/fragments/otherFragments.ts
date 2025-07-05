export const emailFragment = `fragment emailFragment on Email {
  id
  address
  verified
}`;

export const phoneFragment = `fragment phoneFragment on Phone {
  id
  number
  verified
  primary
}`;

export const alertFragment = `fragment alertFragment on Alert {
  id
  relatedId
  relatedUserId
  type
  value
  createdAt
  updatedAt
}`;
