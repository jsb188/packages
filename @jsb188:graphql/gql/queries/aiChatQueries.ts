import { gql } from 'graphql-tag';
import { aiChatFragment, aiChatMessageFragment } from '../fragments/aiChatFragments';

export const aiChatQry = gql`
query aiChat (
  $aiChatId: GenericID!
  $limit: Int
) {
  aiChat (
    aiChatId: $aiChatId
  ) {
    cursor
    ...aiChatFragment

    messages (
      limit: $limit
    ) {
      ...aiChatMessageFragment
    }
  }
}

${aiChatFragment}
${aiChatMessageFragment}
`;

export const aiChatMessagesQry = gql`
query aiChatMessages (
  $aiChatId: GenericID!
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  aiChatMessages (
    aiChatId: $aiChatId
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    ...aiChatMessageFragment
  }
}

${aiChatMessageFragment}
`;

export const aiChatsQry = gql`
query aiChats (
  $filter: AIChatsFilter
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  aiChats (
    filter: $filter
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    cursor
    ...aiChatFragment
  }
}

${aiChatFragment}
`;
