
export const reportFragment = `fragment reportFragment on Report {
  id
  organizationId

  sectionName
  title
  description
  type
  period
  gridLayoutStyle

  activityAt
}`;

export const reportSubmissionFragment = `fragment reportSubmissionFragment on ReportSubmission {
  id
  reportId
  organizationId

  sectionName
  title
  period
  activityAt
}`;


export const reportSectionFragment = `fragment reportSectionFragment on ReportSection {
  id
  isGroupTitle
  sectionName
  title
  description
}`;

export const reportRowDataFragment = `fragment reportRowDataFragment on ReportRowData {
  id
  preset
  className
  isHeader
}`;

export const reportColumnDataFragment = `fragment reportColumnDataFragment on ReportColumnData {
  id
  className
  label
  text
  placeholder
  checked
}`;
