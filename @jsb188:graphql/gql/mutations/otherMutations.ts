import { gql } from 'graphql-tag';
import { alertFragment } from '../fragments/otherFragments';

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

export const alertCallToActionMtn = gql`
mutation alertCallToAction (
  $alertId: GenericID!
  $approve: Boolean!
) {
  alertCallToAction (
    alertId: $alertId
    approve: $approve
  ) {
    ...alertFragment
  }
}

${alertFragment}
`;
