import { gql } from 'graphql-tag';
import { cardFragment, linkFragment } from '../fragments/cardFragments';

export const cardsForUserQry = gql`
query cardsForUser (
  $userId: UserID!
) {
  cardsForUser (
    userId: $userId
  ) {
    id
    cards {
      ...cardFragment

      links {
        ...linkFragment
      }
    }
  }
}

${cardFragment}
${linkFragment}
`;
