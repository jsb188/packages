export const accountFragment = `fragment accountFragment on Account {
  id
  deleted
  color

  profile {
    id
    firstName
    lastName

    photoId
    photoUri
  }

  settings {
    theme
    lightMode
    timeZone
    language
    showSelfAvatar
    isBubbleOther
    showOtherAvatar
  }
}`;
