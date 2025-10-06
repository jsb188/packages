import { gql } from 'graphql-tag';
import { productCalendarEventFragment, productFragment, productLivestockFragment } from '../fragments/productFragments';

export const productsListQry = gql`
query productsList (
  $organizationId: GenericID!
  $productType: ProductType!
  $filterLivestock: ProductLivestockFilter
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  productsList (
    organizationId: $organizationId
    productType: $productType
    filterLivestock: $filterLivestock
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    ...productFragment

    details {
      ...on ProductCalendarEvent {
        ...productCalendarEventFragment
      }
      ...on ProductLivestock {
        ...productLivestockFragment
      }
    }
  }
}

${productFragment}
${productCalendarEventFragment}
${productLivestockFragment}
`;
