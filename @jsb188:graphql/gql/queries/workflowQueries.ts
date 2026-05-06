import { gql } from 'graphql-tag';
import { workflowFragment, workflowRunFragment } from '../fragments/workflowFragments.ts';

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

export const workflowRunsQry = gql`
query workflowRuns (
  $workflowId: GenericID!
) {
  workflowRuns (
    workflowId: $workflowId
  ) {
    ...workflowRunFragment
  }
}

${workflowRunFragment}
`;
