import { gql } from 'graphql-tag';

export const getSignedUploadUrlMtn = gql`
mutation getSignedUploadUrl (
  $organizationId: GenericID!
  $fileName: String!
  $contentType: String!
) {
  getSignedUploadUrl (
    organizationId: $organizationId
    fileName: $fileName
    contentType: $contentType
  )
}
`;
