import { gql } from 'graphql-tag';
import { chatFragment, chatMessageFragment, chatPartial, chatUserStatusFragment } from '../fragments/chatFragments';
import { userPartial } from '../fragments/userFragments';

export const chatsListQry = gql`
query chatsList (
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  chatsList (
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    cursor
    ...chatFragment

    userStatus {
      ...chatUserStatusFragment
    }
  }
}

${chatFragment}
${chatUserStatusFragment}
`;

export const myChatsQry = gql`
query myChats (
  $type: ChatType!
) {
  myChats (
    type: $type
  ) {
    ...chatPartial
  }
}

${chatPartial}
`;

export const chatQry = gql`
query chat (
  $chatId: GenericID!
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  chat (
    chatId: $chatId
  ) {
    ...chatPartial

    participants {
      ...userPartial
    }

    messages (
      cursor: $cursor
      after: $after
      limit: $limit
    ) {
      cursor
      ...chatMessageFragment
    }
  }
}

${chatPartial}
${chatMessageFragment}
${userPartial}
`;

export const userIdToChatIdQry = gql`
query userIdToChatId (
  $userId: UserID!
) {
  userIdToChatId (
    userId: $userId
  ) {
    id
    friendId
  }
}
`;
