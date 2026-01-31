import { gql } from 'graphql-tag';

export const getSignedUploadUrlMtn = gql`
mutation getSignedUploadUrl (
  $organizationId: GenericID!
  $fileName: String!
  $contentType: String!
  $uploadIntent: StorageIntentObject!
) {
  getSignedUploadUrl (
    organizationId: $organizationId
    fileName: $fileName
    contentType: $contentType
    uploadIntent: $uploadIntent
  )
}
`;
