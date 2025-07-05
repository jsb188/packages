export const accountFragment = `fragment accountFragment on Account {
  id
  deleted

  profile {
    id
    firstName
    lastName

    photoId
    photoUri
  }
}`;
