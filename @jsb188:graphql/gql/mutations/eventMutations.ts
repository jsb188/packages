import { gql } from 'graphql-tag';
import { eventFragment } from '../fragments/eventFragments';
import { addressFragment } from '../fragments/otherFragments';

export const editEventMtn = gql`
mutation editEvent (
  $organizationId: GenericID!
  $eventId: GenericID!
) {
  editEvent (
    organizationId: $organizationId
    eventId: $eventId
  ) {
    ...eventFragment

    address {
      ...addressFragment
    }
  }
}

${eventFragment}
${addressFragment}
`;

export const deleteEventMtn = gql`
mutation deleteEvent (
  $organizationId: GenericID!
  $eventId: GenericID!
) {
  deleteEvent (
    organizationId: $organizationId
    eventId: $eventId
  )
}
`;
