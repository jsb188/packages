import { gql } from 'graphql-tag';
import { accountFragment } from '../fragments/accountFragments';
import { eventAttendanceFragment, eventFragment } from '../fragments/eventFragments';
import { organizationComplianceFragment, organizationFragment } from '../fragments/organizationFragments';
import { addressFragment } from '../fragments/otherFragments';

export const eventsListQry = gql`
query eventsList (
  $organizationId: GenericID
  $timeZone: String
  $type: EventType
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  eventsList (
    organizationId: $organizationId
    timeZone: $timeZone
    type: $type
    cursor: $cursor
    after: $after
    limit: $limit
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

export const eventAttendanceListQry = gql`
query eventAttendanceList (
  $eventId: GenericID!
  $organizationId: GenericID!
  $calDate: CalDateString!
) {
  eventAttendanceList (
    eventId: $eventId
    organizationId: $organizationId
    calDate: $calDate
  ) {
    ...eventAttendanceFragment

    organization {
      ...organizationFragment

      compliance {
        ...organizationComplianceFragment
      }
    }

    checkedBy {
      ...accountFragment
    }
  }
}

${eventAttendanceFragment}
${organizationFragment}
${organizationComplianceFragment}
${accountFragment}
`;
