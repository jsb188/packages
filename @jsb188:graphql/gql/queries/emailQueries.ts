import { gql } from 'graphql-tag';
import { inboundEmailAttachmentFragment, inboundEmailFragment } from '../fragments/emailFragments.ts';

export const inboundEmailQry = gql`
query inboundEmail (
  $organizationId: GenericID!
  $inboundEmailId: GenericID!
) {
  inboundEmail (
    organizationId: $organizationId
    inboundEmailId: $inboundEmailId
  ) {
    ...inboundEmailFragment
  }
}

${inboundEmailAttachmentFragment}
${inboundEmailFragment}
`;

export const inboundEmailsQry = gql`
query inboundEmails (
  $organizationId: GenericID!
  $filter: InboundEmailsFilter
  $sort: InboundEmailsSort
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  inboundEmails (
    organizationId: $organizationId
    filter: $filter
    sort: $sort
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    ...inboundEmailFragment
  }
}

${inboundEmailAttachmentFragment}
${inboundEmailFragment}
`;
