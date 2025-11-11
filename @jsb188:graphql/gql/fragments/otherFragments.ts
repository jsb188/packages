export const emailFragment = `fragment emailFragment on Email {
  id
  address
  verified
}`;

export const phoneFragment = `fragment phoneFragment on Phone {
  id
  number
  verified
}`;

export const addressFragment = `fragment addressFragment on Address {
  id
	organizationId
  line1
  line2
  city
  state
  postalCode
  country
	createdAt
	updatedAt
}`;
