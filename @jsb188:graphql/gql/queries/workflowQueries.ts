import { gql } from 'graphql-tag';
import { workflowFragment } from '../fragments/workflowFragments';

export const workflowsQry = gql`
query workflows (
  $organizationId: GenericID!
) {
  workflows (
    organizationId: $organizationId
  ) {
    ...workflowFragment
  }
}

${workflowFragment}
`;
