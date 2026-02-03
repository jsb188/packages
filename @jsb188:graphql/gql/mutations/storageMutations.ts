import { gql } from 'graphql-tag';

export const createSignedUploadUrlMtn = gql`
mutation createSignedUploadUrl (
  $temporaryId: String!
  $organizationId: GenericID!
  $fileName: String!
  $contentType: String!
  $uploadIntent: StorageIntentObject!
) {
  createSignedUploadUrl (
    temporaryId: $temporaryId
    organizationId: $organizationId
    fileName: $fileName
    contentType: $contentType
    uploadIntent: $uploadIntent
  ) {
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
