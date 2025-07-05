// NOTE: Can't use "hasAccess" here; because live chats need participants[] data in back-end
// NOTE: "chatFragment" is used in lists, "chatPartial" is used in chat main
export const chatFragment = `fragment chatFragment on Chat {
  id
  ownerId
  name
  note
  deleted
  photoUri
  unread
  pinned

  type
  status
  liveCategory

  theme {
    id
    name
    backgroundPhotoUri
  }

  lastMessage
  lastMessageAt
  lastMessageUserId
  lastMessageDisplayName
  lastMessagePhotoUri
  lastMessageIsSelf
}`;

export const chatStickerFragment = `fragment chatStickerFragment on ChatSticker {
  id
  code
  photoId
  photoUri
}`;

// NOTE: "chatFragment" is used in lists, "chatPartial" is used in chat main
export const chatPartial = `fragment chatPartial on Chat {
  id
  ownerId
  name
  note
  deleted
  photoUri
  unread
  hasAccess

  type
  status
  liveCategory

  theme {
    id
    name
    backgroundPhotoUri
  }

  stickers {
    id
    code
    photoId
    photoUri
  }
}`;

export const chatStatusPartial = `fragment chatStatusPartial on Chat {
  id
  unread
  pinned
  status
}`;

export const chatMessageFragment = `fragment chatMessageFragment on ChatMessage {
  id
  userId
  aiId

  displayName
  photoUri
  plusStatus
  badge
  message
  attachmentUri
  interactionType

  metaData {
    stickers
  }

  createdAt
  updatedAt
}`;

export const chatUserStatusFragment = `fragment chatUserStatusFragment on ChatUserStatus {
  id
  onlineStatus
}`;
