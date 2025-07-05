import { gql } from 'graphql-tag';
import { aiChatFragment, aiChatMessageFragment } from '../fragments/aiChatFragments';

export const startAIChatMtn = gql`
mutation startAIChat (
  $organizationId: GenericID!
  $text: String!
) {
  startAIChat (
    organizationId: $organizationId
    text: $text
  ) {
    sessionKey
    node {
      ...aiChatFragment
    }
  }
}

${aiChatFragment}
`;

export const sendAIChatMessageMtn = gql`
mutation sendAIChatMessage (
  $aiChatId: GenericID!
  $organizationId: GenericID
  $variablesKey: String
  $text: String!
) {
  sendAIChatMessage (
    aiChatId: $aiChatId
    organizationId: $organizationId
    variablesKey: $variablesKey
    text: $text
  ) {
    sessionKey
    node {
      ...aiChatMessageFragment
    }
  }
}

${aiChatMessageFragment}
`;

export const stopAIChatMessageMtn = gql`
mutation stopAIChatMessage (
  $aiChatId: GenericID!
) {
  stopAIChatMessage (
    aiChatId: $aiChatId
  )
}
`;
