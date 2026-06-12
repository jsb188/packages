import { gql } from 'graphql-tag';
import { accountFragment } from '../fragments/accountFragments.ts';
import { integrationConnectionFragment } from '../fragments/integrationFragments.ts';
import { organizationChildFragment, organizationComplianceFragment, organizationFragment, organizationRelationshipFragment, organizationSiteFragment, orgPageRouteFragment } from '../fragments/organizationFragments.ts';
import { emailFragment, phoneFragment } from '../fragments/otherFragments.ts';
import { storageFileFragment } from '../fragments/storageFragments.ts';

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

        files {
          ...storageFileFragment
        }
      }
    }
  }
}

${organizationFragment}
${organizationComplianceFragment}
${organizationRelationshipFragment}
${storageFileFragment}
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

        files {
          ...storageFileFragment
        }
      }
      integrations {
        ...integrationConnectionFragment
      }
    }
  }
}

${organizationFragment}
${organizationComplianceFragment}
${organizationRelationshipFragment}
${integrationConnectionFragment}
${storageFileFragment}
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

        files {
          ...storageFileFragment
        }
      }
    }
  }
}

${organizationChildFragment}
${organizationFragment}
${organizationComplianceFragment}
${storageFileFragment}
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

export const organizationSitesQry = gql`
query organizationSites (
  $organizationId: GenericID!
  $parentId: GenericID!
) {
  organizationSites (
    organizationId: $organizationId
    parentId: $parentId
  ) {
    ...organizationSiteFragment
  }
}

${organizationSiteFragment}
`;

export const pageRoutesQry = gql`
query pageRoutes (
  $organizationId: GenericID!
) {
  pageRoutes (
    organizationId: $organizationId
  ) {
    ...orgPageRouteFragment
  }
}

${orgPageRouteFragment}
`;
