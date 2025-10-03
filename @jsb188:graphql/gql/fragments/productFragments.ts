
export const productFragment = `fragment productFragment on Product {
  id
  organizationId
  cursor

  metadata {
    overview
  }

  createdAt
  updatedAt
}`;

export const productArableFragment = `fragment productArableFragment on ProductArable {
  __typename

  id
}`;

export const productLivestockFragment = `fragment productLivestockFragment on ProductLivestock {
  __typename

  id
  damIdentifier
  livestockIdentifier
  livestockGroup

  type
  status
  livestockClass

  birthDate
  deathDate
}`;
