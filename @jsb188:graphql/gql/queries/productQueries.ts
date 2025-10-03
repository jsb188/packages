import { gql } from 'graphql-tag';
import { productArableFragment, productFragment, productLivestockFragment } from '../fragments/productFragments';

export const productsListQry = gql`
query productsList (
  $organizationId: GenericID!
  $filterLivestock: ProductLivestockFilter
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  productsList (
    organizationId: $organizationId
    filterLivestock: $filterLivestock
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    ...productFragment

    details {
      ...on ProductArable {
        ...productArableFragment
      }
      ...on ProductLivestock {
        ...productLivestockFragment
      }
    }
  }
}

${productFragment}
${productArableFragment}
${productLivestockFragment}
`;
