
export const workflowFragment = `fragment workflowFragment on Workflow {
  id
  organizationId
  reportId

  logType
  feature

  title

  steps {
    iconName
    label
    value
  }

  schedule
  scheduleInterval
  active

  startedAt
  nextAt

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
