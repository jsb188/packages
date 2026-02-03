import { gql } from 'graphql-tag';

export const createSignedUploadUrlMtn = gql`
mutation createSignedUploadUrl (
  $organizationId: GenericID!
  $fileName: String!
  $contentType: String!
  $uploadIntent: StorageIntentObject!
) {
  createSignedUploadUrl (
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
  $storageId: GenericID!
) {
  deleteStorageFile (
    organizationId: $organizationId
    storageId: $storageId
  )
}
`;
