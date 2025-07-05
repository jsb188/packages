import { gql } from 'graphql-tag';
import { friendFragment, userFragment, userPersonaFragment, plusFragment } from '../fragments/userFragments';

export const editUserMtn = gql`
mutation editUser (
  $photoId: GenericID
  $backgroundPhotoId: GenericID
  $user: UserInput
  $profile: UserProfileInput
  $theme: ThemeInput
) {
  editUser (
    photoId: $photoId
    backgroundPhotoId: $backgroundPhotoId
    user: $user
    profile: $profile
    theme: $theme
  ) {
    ...userFragment
    lightMode
  }
}

${userFragment}
`;

export const editUserPlusMtn = gql`
mutation editUserPlus (
  $badge: String
) {
  editUserPlus (
    badge: $badge
  ) {
    ...plusFragment
  }
}

${plusFragment}
`;

export const editUserFriendshipMtn = gql`
mutation editUserFriendship (
  $userId: UserID!
  $friendStatus: FriendStatus!
) {
  editUserFriendship (
    userId: $userId
    friendStatus: $friendStatus
  ) {
    ...friendFragment
  }
}

${friendFragment}
`;

export const editPersonasMtn = gql`
mutation editPersonas (
  $personas: [UserPersonaInput]
) {
  editPersonas (
    personas: $personas
  ) {
    ...userPersonaFragment
  }
}

${userPersonaFragment}
`;

export const addEditPersonaMtn = gql`
mutation addEditPersona (
  $personaId: GenericID
  $order: Int
  $name: String
  $photoId: GenericID
) {
  addEditPersona(
    personaId: $personaId
    order: $order
    name: $name
    photoId: $photoId
  ) {
    ...userPersonaFragment
  }
}

${userPersonaFragment}
`;
