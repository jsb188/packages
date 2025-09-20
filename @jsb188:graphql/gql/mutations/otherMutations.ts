import { gql } from 'graphql-tag';

export const prepareFileUploadMtn = gql`
mutation prepareFileUpload (
  $files: [FilePrepareInput]!
) {
  prepareFileUpload (
    files: $files
  ) {
    id
    fileName
    uri
    token
  }
}
`;

export const finishFileUploadMtn = gql`
mutation finishFileUpload (
  $fileIds: [GenericID]!
) {
  finishFileUpload (
    fileIds: $fileIds
  ) {
    id
    uri
  }
}
`;
