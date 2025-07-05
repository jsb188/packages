import { gql } from 'graphql-tag';
import { chatPartial, chatStatusPartial, chatStickerFragment } from '../fragments/chatFragments';

export const editChatMtn = gql`
mutation editChat (
  $chatId: GenericID!
  $name: String
  $note: String
  $liveCategory: LiveCategory
  $theme: ThemeInput
) {
  editChat (
    chatId: $chatId
    name: $name
    note: $note
    liveCategory: $liveCategory
    theme: $theme
  ) {
    ...chatPartial
  }
}

${chatPartial}
`;

export const editChatStatusMtn = gql`
mutation editChatStatus (
  $chatId: GenericID!
  $unread: Boolean
  $pinned: Boolean
  $status: ChatStatus
) {
  editChatStatus (
    chatId: $chatId
    unread: $unread
    pinned: $pinned
    status: $status
  ) {
    ...chatStatusPartial
  }
}

${chatStatusPartial}
`;

export const createLiveChatMtn = gql`
mutation createLiveChat (
  $name: String!
) {
  createLiveChat (
    name: $name
  )
}
`;

export const editCoOwnerMtn = gql`
mutation editCoOwner (
  $chatId: GenericID!
  $userId: UserID!
  $remove: Boolean
) {
  editCoOwner (
    chatId: $chatId
    userId: $userId
    remove: $remove
  )
}
`;

export const editChatStickerMtn = gql`
mutation editChatSticker (
  $stickerId: GenericID!
  $photoId: GenericID
  $code: String
) {
  editChatSticker (
    stickerId: $stickerId
    photoId: $photoId
    code: $code
  ) {
    ...chatStickerFragment
  }
}

${chatStickerFragment}
`;

export const deleteChatStickerMtn = gql`
mutation deleteChatSticker (
  $stickerId: GenericID!
) {
  deleteChatSticker (
    stickerId: $stickerId
  )
}
`;

export const createChatStickerMtn = gql`
mutation createChatSticker (
  $chatId: GenericID!
  $photoId: GenericID!
  $code: String!
  $coverPhoto: Boolean
) {
  createChatSticker (
    chatId: $chatId
    photoId: $photoId
    code: $code
    coverPhoto: $coverPhoto
  ) {
    ...chatStickerFragment
  }
}

${chatStickerFragment}
`;
