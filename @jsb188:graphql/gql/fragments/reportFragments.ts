
export const reportFragment = `fragment reportFragment on Report {
  id
  organizationId

  title
  description
  type
  period
  gridLayoutStyle

  activityAt
}`;

export const reportSectionFragment = `fragment reportSectionFragment on ReportSection {
  id
  isGroupTitle
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
