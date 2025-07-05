import { gql } from 'graphql-tag';

export const updateNoteQry = gql`
query updateNote {
  updateNote {
    webVersion
    mobileVersion
    emoji
    title
    at
    text
  }
}
`;
