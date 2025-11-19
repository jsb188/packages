import { gql } from 'graphql-tag';
import { accountFragment } from '../fragments/accountFragments';
import { organizationComplianceFragment, organizationFragment } from '../fragments/organizationFragments';
import { productAttendanceFragment, productCalEventFragment, productFragment, productLivestockFragment } from '../fragments/productFragments';

export const productsListQry = gql`
query productsList (
  $organizationId: GenericID!
  $filter: ProductsFilter!
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  productsList (
    organizationId: $organizationId
    filter: $filter
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    ...productFragment

    details {
      ...on ProductCalEvent {
        ...productCalEventFragment
      }
      ...on ProductLivestock {
        ...productLivestockFragment
      }
    }
  }
}

${productFragment}
${productCalEventFragment}
${productLivestockFragment}
`;

export const productAttendanceListQry = gql`
query productAttendanceList (
  $productId: GenericID!
  $organizationId: GenericID!
  $calDate: CalDateString!
) {
  productAttendanceList (
    productId: $productId
    organizationId: $organizationId
    calDate: $calDate
  ) {
    ...productAttendanceFragment

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

${productAttendanceFragment}
${organizationFragment}
${organizationComplianceFragment}
${accountFragment}
`;
