
export const reportFragment = `fragment reportFragment on Report {
  id
  organizationId

  title
  description
  type
  period
  activityAt
}`;

export const reportSectionFragment = `fragment reportSectionFragment on ReportSection {
  id
  isGroupTitle
  title
  description
}`;
