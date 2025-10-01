
export const productFragment = `fragment productFragment on Product {
  id
  organizationId
  cursor
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
  animalId
  damId
  type
  status
  breed
  birthDate
  deathDate
}`;
