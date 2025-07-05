import { gql } from 'graphql-tag';
import { friendFragment, userFragment } from '../fragments/userFragments';

export const searchUsersQry = gql`
query searchUsers (
  $searchQuery: String!
) {
  searchUsers (
    searchQuery: $searchQuery
  ) {
    query
    results {
      ...friendFragment

      user {
        ...userFragment
      }
    }
  }
}

${friendFragment}
${userFragment}
`;

export const friendQry = gql`
query friend (
  $userId: UserID!
) {
  friend (
    userId: $userId
  ) {
    ...friendFragment

    user {
      ...userFragment
    }
  }
}

${friendFragment}
${userFragment}
`;

export const friendsListQry = gql`
query friendsList (
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  friendsList (
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    cursor
    ...friendFragment

    user {
      ...userFragment
    }
  }
}

${friendFragment}
${userFragment}
`;

export const friendRequestsQry = gql`
query friendRequests (
  $pendingOnly: Boolean
) {
  friendRequests (
    pendingOnly: $pendingOnly
  ) {
    ...friendFragment

    user {
      ...userFragment
    }
  }
}

${friendFragment}
${userFragment}
`;

// Unused at the moment
// export const personasQry = gql`
// query personas (
//   $userId: UserID
// ) {
//   personas (
//     userId: $userId
//   ) {
//     id
//     list {
//       ...userPersonaFragment
//     }
//   }
// }

// ${userPersonaFragment}
// `;
