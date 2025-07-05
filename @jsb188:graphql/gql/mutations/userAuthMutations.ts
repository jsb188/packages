import { gql } from 'graphql-tag';

export const signOutMtn = gql`
mutation signOut {
  signOut
}
`;

export const updateAppSettingsMtn = gql`
mutation updateAppSettings (
  $stickySection: StickySection
) {
  updateAppSettings (
    stickySection: $stickySection
  ) {
    stickySection
  }
}
`;

export const consumeTokenMtn = gql`
mutation consumeToken (
  $token: Token!
  $expected: TokenType
) {
  consumeToken (
    token: $token
    expected: $expected
  ) {
    id
    success
    value
  }
}`;
