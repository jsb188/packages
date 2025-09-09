import { gql } from 'graphql-tag';
import { organizationFragment, organizationRelationshipFragment } from '../fragments/organizationFragments';

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
    }
  }
}

${organizationFragment}
${organizationRelationshipFragment}
`;

export const myOrganizationsQry = gql`
query myOrganizations {
  myOrganizations {
    ...organizationRelationshipFragment

    organization {
      ...organizationFragment
      membersCount
    }
  }
}

${organizationFragment}
${organizationRelationshipFragment}
`;

export const childOrganizationsQry = gql`
query childOrganizations (
  $organizationId: GenericID!
) {
  childOrganizations (
    organizationId: $organizationId
  ) {
    id
    childType
    addedAt

    organization {
      ...organizationFragment
    }
  }
}

${organizationFragment}
`;