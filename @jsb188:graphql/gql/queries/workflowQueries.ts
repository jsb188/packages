import { gql } from 'graphql-tag';
import { dataTablePartialFragment } from '../fragments/dataTableFragments.ts';
import { workflowFragment, workflowRunFragment } from '../fragments/workflowFragments.ts';

export const workflowsQry = gql`
query workflows (
  $organizationId: GenericID!
) {
  workflows (
    organizationId: $organizationId
  ) {
    ...workflowFragment

    dataTables {
      ...dataTablePartialFragment
    }
  }
}

${workflowFragment}
${dataTablePartialFragment}
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
