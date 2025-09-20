import { gql } from 'graphql-tag';
import { accountFragment } from '../fragments/accountFragments';
import { organizationEventFragment, organizationChildFragment, organizationComplianceFragment, organizationFragment, organizationRelationshipFragment } from '../fragments/organizationFragments';
import { addressFragment, emailFragment, phoneFragment } from '../fragments/otherFragments';

// Always use organizationRelationship() instead

// export const organizationQry = gql`
// query organization (
//   $organizationId: GenericID!
// ) {
//   organization (
//     organizationId: $organizationId
//   ) {
//     ...organizationFragment
//   }
// }

// ${organizationFragment}
// `;

export const organizationRelationshipQry = gql`
query organizationRelationship (
  $organizationId: GenericID!
) {
  organizationRelationship (
    organizationId: $organizationId
  ) {
    ...organizationRelationshipFragment

    organization {
      ...organizationFragment
      membersCount

      compliance {
        ...organizationComplianceFragment
      }
    }
  }
}

${organizationFragment}
${organizationComplianceFragment}
${organizationRelationshipFragment}
`;

export const myOrganizationsQry = gql`
query myOrganizations {
  myOrganizations {
    ...organizationRelationshipFragment

    organization {
      ...organizationFragment
      membersCount

      compliance {
        ...organizationComplianceFragment
      }
    }
  }
}

${organizationFragment}
${organizationComplianceFragment}
${organizationRelationshipFragment}
`;

export const organizationEventsQry = gql`
query organizationEvents (
  $organizationId: GenericID
  $timeZone: String
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  organizationEvents (
    organizationId: $organizationId
    timeZone: $timeZone
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    ...organizationEventFragment

    address {
      ...addressFragment
    }
  }
}

${organizationEventFragment}
${addressFragment}
`;

export const childOrganizationsQry = gql`
query childOrganizations (
  $organizationId: GenericID!
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  childOrganizations (
    organizationId: $organizationId
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    ...organizationChildFragment

    organization {
      ...organizationFragment
      membersCount

      compliance {
        ...organizationComplianceFragment
      }
    }

    primaryContact {
      ...accountFragment

      email {
        ...emailFragment
      }

      phone {
        ...phoneFragment
      }
    }
  }
}

${organizationChildFragment}
${organizationFragment}
${organizationComplianceFragment}
${accountFragment}
${emailFragment}
${phoneFragment}
`;
