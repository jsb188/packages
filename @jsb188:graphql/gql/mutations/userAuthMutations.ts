import { gql } from 'graphql-tag';

export const signOutMtn = gql`
mutation signOut {
  signOut
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
