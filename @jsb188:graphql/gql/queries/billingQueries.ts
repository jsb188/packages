import { gql } from 'graphql-tag';
import { platformProductFragment } from '../fragments/billingFragments.ts';

export const platformProductsQry = gql`
query platformProducts {
  platformProducts {
    ...platformProductFragment
  }
}

${platformProductFragment}
`;
