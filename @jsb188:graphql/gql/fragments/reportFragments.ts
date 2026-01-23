
export const reportFragment = `fragment reportFragment on Report {
  id
  organizationId

  documentName
  title
  description
  type
  period
  evidencesCount
  gridLayoutStyle

  activityAt
}`;

export const reportSectionFragment = `fragment reportSectionFragment on ReportSection {
  id
  isGroupTitle
  sectionKey
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

export const reportAvailabilityFragment = `fragment reportAvailabilityFragment on ReportAvailability {
  id
  organizationId
  type
  periods
}`;
