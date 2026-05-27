export const inboundEmailAttachmentFragment = `fragment inboundEmailAttachmentFragment on InboundEmailAttachment {
  name
  contentType
  contentLength
}`;

export const inboundEmailFragment = `fragment inboundEmailFragment on InboundEmail {
  id
  cursor
  organizationId
  recipientEmail
  senderEmail
  subject
  postmarkMessageId
  status
  statusSummary
  previewText
  bodyFormat
  bodyText
  attachments {
    ...inboundEmailAttachmentFragment
  }
  receivedAt
  processingStartedAt
  processingCompletedAt
}`;
