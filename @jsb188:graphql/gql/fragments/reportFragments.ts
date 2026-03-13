export const reportFragment = `fragment reportFragment on Report {
  id
  organizationId

  documentName
  title
  description
  frequency
  reportGroupId
  groupName
  groupShortName
  period
  gridLayoutStyle
}`;

export const reportSectionFragment = `fragment reportSectionFragment on ReportSection {
  id
  isGroupTitle
  sectionKey
  title
  description
  requireFileUploads
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

export const reportGroupFragment = `fragment reportGroupFragment on ReportGroup {
  id
  name
  shortName
  layout {
    columns
    headers
    gridLayoutStyle
  }
  lastSubmissionPeriod
  lastSubmissionReportId
}`;

export const reportSubmissionFragment = `fragment reportSubmissionFragment on ReportSubmission {
  id
  reportId
  reportSubmissionIdEnc

  organizationId
  organizationIdEnc
  organizationName
  organizationOperation

  childOrgId
  childOrgIdEnc
  childOrgName
  childOrgOperation

  period
  status
  reportGroupId
  groupName
  groupShortName
  activityAt
  createdAt
  updatedAt
}`;
