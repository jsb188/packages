import { gql } from 'graphql-tag';
import { accountFragment } from '../fragments/accountFragments';
import { organizationChildFragment, organizationComplianceFragment, organizationFragment, organizationInstructionsFragment, organizationRelationshipFragment } from '../fragments/organizationFragments';
import { emailFragment, phoneFragment } from '../fragments/otherFragments';

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

export const childOrganizationsQry = gql`
query childOrganizations (
  $organizationId: GenericID!
  $filter: ChildOrgsFilter
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  childOrganizations (
    organizationId: $organizationId
    filter: $filter
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
  }
}

${organizationChildFragment}
${organizationFragment}
${organizationComplianceFragment}
`;

export const organizationWorkflowsQry = gql`
query organizationWorkflows (
  $organizationId: GenericID!
  $operation: OrganizationOperation!
) {
  organizationWorkflows (
    organizationId: $organizationId
    operation: $operation
  ) {
    ...organizationInstructionsFragment
  }
}

${organizationInstructionsFragment}
`;

export const organizationMembersQry = gql`
query organizationMembers (
  $organizationId: GenericID!
  $showGuests: Boolean
) {
  organizationMembers (
    organizationId: $organizationId
    showGuests: $showGuests
  ) {
    ...organizationRelationshipFragment

    account {
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

${organizationRelationshipFragment}
${accountFragment}
${emailFragment}
${phoneFragment}
`;
