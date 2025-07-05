import { gql } from 'graphql-tag';
import { alertFragment } from '../fragments/otherFragments';

export const alertsQry = gql`
query alerts {
  alerts {
    ...alertFragment
  }
}

${alertFragment}
`;
