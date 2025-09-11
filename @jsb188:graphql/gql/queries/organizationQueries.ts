import { gql } from 'graphql-tag';
import { accountFragment } from '../fragments/accountFragments';
import { organizationChildFragment, organizationFragment, organizationRelationshipFragment } from '../fragments/organizationFragments';
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
${accountFragment}
${emailFragment}
${phoneFragment}
`;
