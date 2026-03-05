import { gql } from 'graphql-tag';

export const createSignedUploadUrlMtn = gql`
mutation createSignedUploadUrl (
  $organizationId: GenericID!
  $fileName: String!
  $contentType: String!
  $fileSize: Int!
  $uploadIntent: StorageIntentObject!
) {
  createSignedUploadUrl (
    organizationId: $organizationId
    fileName: $fileName
    contentType: $contentType
    fileSize: $fileSize
    uploadIntent: $uploadIntent
  ) {
    id
    signedUrl
    fileUri
  }
}
`;

export const deleteStorageFileMtn = gql`
mutation deleteStorageFile (
  $organizationId: GenericID!
  $fileUri: String!
) {
  deleteStorageFile (
    organizationId: $organizationId
    fileUri: $fileUri
  )
}
`;
