/**
 * Reports; all types
 */

export const REPORT_SORT_OPTS = [
	'PERIOD_DESC',
	'ACTIVITY_DESC',
];

export const REPORT_ROW_PRESETS = [

  'REPORT_SUMMARY',
  'LINE_TITLE',
  'LINE_ITEMS',
  'TEXTS',

  // All deprecated below
	'LABELS',
	'BREAK',
	'Q_AND_A',
  'LONG_TEXTS', // Same as "TEXTS" but has a different function in <FileBrowserPlus>
	'HEADINGS',
  'EVIDENCES',
];

export const REPORT_NUMBERED_PRESETS = [
  'LINE_ITEMS',
];

export const REPORT_FREQUENCY_ENUMS = [
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'ANNUALLY',
];

export const REPORT_STATUS_ENUMS = [
  'PASS',
  'WARNING',
  'FAIL',
];
