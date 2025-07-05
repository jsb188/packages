export const userFragment = `fragment userFragment on User {
  id
  username
  displayName
  moderator
  deleted
  plusStatus
  onlineStatus
  statusMessage

  theme {
    id
    name
    backgroundPhotoId
    backgroundPhotoUri
  }

  profile {
    id
    description
    pronouns
    photoId
    photoUri
    backgroundPhotoId
    backgroundPhotoUri
    adult
  }
}`;

export const userPartial = `fragment userPartial on User {
  id
  displayName
  username
  onlineStatus
  plusStatus
  statusMessage

  profile {
    id
    photoId
    photoUri
    description
  }
}`;

export const friendFragment = `fragment friendFragment on Friend {
  id
  chatId
  myStatus
  otherStatus
  activityAt
}`;

export const plusFragment = `fragment plusFragment on UserPlus {
  id
  checkedAt
  expireAt
  cancelled
  type
  badge
}`;

export const userPersonaFragment = `fragment userPersonaFragment on UserPersona {
  id
  order
  name
  photoId
  photoUri
}`;
