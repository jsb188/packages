
export const workflowFragment = `fragment workflowFragment on Workflow {
  id
  organizationId

  logType
  feature

  title
  instructions

  schedule
  active

  startedAt
  nextAt
  createdAt
  updatedAt
}`;
