
export const workflowFragment = `fragment workflowFragment on Workflow {
  id
  organizationId

  logType
  feature

  title
  instructions

  steps {
    iconName
    label
    value
  }

  schedule
  active

  startedAt
  nextAt

  createdAt
  updatedAt
}`;
