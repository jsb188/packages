import { gql } from 'graphql-tag';
import { accountFragment } from '../fragments/accountFragments';

export const editAccountMtn = gql`
mutation editAccount (
  $accountId: GenericID
  $photoId: GenericID
  $profile: AccountProfileInput
  $settings: AccountSettingsInput
) {
  editAccount (
    accountId: $accountId
    photoId: $photoId
    profile: $profile
    settings: $settings
  ) {
    ...accountFragment
  }
}
${accountFragment}
`;

export const requestChangeEmailMtn = gql`
mutation requestChangeEmail (
  $emailAddress: String!
) {
  requestChangeEmail (
    emailAddress: $emailAddress
  )
}
`;