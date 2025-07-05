export const aiChatFragment = `fragment aiChatFragment on AIChat {
  id
  organizationId
  accountId
  calDate
  summary
  createdAt
  updatedAt
}`;

export const aiChatMessageFragment = `fragment aiChatMessageFragment on AIChatMessage {
  id
  accountId
  type
  cursor
  text
  photoUri
  finished
  at
}`;
