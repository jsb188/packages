
export const workflowFragment = `fragment workflowFragment on Workflow {
  id
  organizationId

  logType
  feature

  title

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

export const workflowActionFragment = `fragment workflowActionFragment on WorkflowAction {
  id
  logId

  title
  message
  instruction

  scheduledAt
  delay
  completed

  createdAt
  updatedAt
}`;

export const workflowRunFragment = `fragment workflowRunFragment on WorkflowRun {
  id
  workflowId
  logId

  runKey
  iterations
  progressReport
  message
  status

  scheduledDate
  followUpAt
  activityAt
}`;
