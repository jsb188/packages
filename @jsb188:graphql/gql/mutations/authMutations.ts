import { gql } from 'graphql-tag';
import { accountAuthFragment } from '../fragments/accountAuthFragments';
import { emailFragment, phoneFragment } from '../fragments/otherFragments';
import { accountFragment } from '../fragments/accountFragments';

const authenticateResultText = `...accountAuthFragment

    account {
      ...accountFragment

      email {
        ...emailFragment
      }

      phone {
        ...phoneFragment
      }
    }`;

const authenticateFragments = `
${accountAuthFragment}
${accountFragment}
${emailFragment}
${phoneFragment}
`;

export const confirmPasswordMtn = gql`
mutation confirmPassword (
  $password: String!
) {
  confirmPassword (
    password: $password
  )
}
`;


export const authenticateWithPasswordMtn = gql`
mutation authenticateWithPassword (
  $identifier: String!
  $password: String!
) {
  authenticateWithPassword (
    identifier: $identifier
    password: $password
  ) {
    ${authenticateResultText}
  }
}
${authenticateFragments}
`;

export const authenticateWithTokenMtn = gql`
mutation authenticateWithToken (
  $token: Token!
) {
  authenticateWithToken (
    token: $token
  ) {
    ${authenticateResultText}
  }
}
${authenticateFragments}
`;

export const continueWithGoogleMtn = gql`
mutation continueWithGoogle (
  $oauthToken: String!
) {
  continueWithGoogle (
    oauthToken: $oauthToken
  ) {
    ${authenticateResultText}
  }
}
${authenticateFragments}
`;

export const checkUsernameOrEmailMtn = gql`
mutation checkUsernameOrEmail (
  $usernameOrEmail: String!
  $authCheck: Boolean
) {
  checkUsernameOrEmail (
    usernameOrEmail: $usernameOrEmail
    authCheck: $authCheck
  ) {
    value
    type
    hasPassword
    taken
  }
}`;

export const changeAccountPasswordMtn = gql`
mutation changeAccountPassword (
  $password: String!
  $currentPassword: String
  $token: Token
) {
  changeAccountPassword (
    password: $password
    currentPassword: $currentPassword
    token: $token
  )
}`;

export const requestTokenizedEmailMtn = gql`
mutation requestTokenizedEmail (
  $email: String!
  $requestType: TokenType!
) {
  requestTokenizedEmail (
    email: $email
    requestType: $requestType
  )
}`;

export const sendPhoneVerificationCodeMtn = gql`
mutation sendPhoneVerificationCode (
  $phone: String!
) {
  sendPhoneVerificationCode (
    phone: $phone
  )
}`;

export const confirmPhoneVerificationCodeMtn = gql`
mutation confirmPhoneVerificationCode (
  $phone: String!
  $code: String!
) {
  confirmPhoneVerificationCode (
    phone: $phone
    code: $code
  ) {
    success
    token
  }
}`;

export const signUpWithEmailMtn = gql`
mutation signUpWithEmail (
  $emailAddress: String!
  $password: String!
) {
  signUpWithEmail (
    emailAddress: $emailAddress
    password: $password
  )
}`;

export const signInWithAppleMtn = gql`
mutation signInWithApple (
  $code: String!
  $idToken: String!
) {
  signInWithApple (
    code: $code
    idToken: $idToken
  ) {
    ${authenticateResultText}
  }
}
${authenticateFragments}
`;