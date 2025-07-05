import { gql } from 'graphql-tag';
import { platformProductFragment } from '../fragments/billingFragments';

export const platformProductsQry = gql`
query platformProducts {
  platformProducts {
    ...platformProductFragment
  }
}

${platformProductFragment}
`;
