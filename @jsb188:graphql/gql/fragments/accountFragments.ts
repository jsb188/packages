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
}`;
