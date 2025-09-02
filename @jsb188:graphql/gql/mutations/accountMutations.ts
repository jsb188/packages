import { gql } from 'graphql-tag';
import { accountFragment } from '../fragments/accountFragments';

export const editAccountMtn = gql`
mutation editAccount (
  $accountId: GenericID
  $photoId: GenericID
  $profile: AccountProfileInput
) {
  editAccount (
    accountId: $accountId
    photoId: $photoId
    profile: $profile
  ) {
    ...accountFragment
  }
}
${accountFragment}
`;
