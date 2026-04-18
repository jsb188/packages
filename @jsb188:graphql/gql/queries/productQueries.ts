import { gql } from 'graphql-tag';
import { productCalEventFragment, productFragment } from '../fragments/productFragments';

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
    }
  }
}

${productFragment}
${productCalEventFragment}
`;
