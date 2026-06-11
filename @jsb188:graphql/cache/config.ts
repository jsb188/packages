
/**
 * Rules for GraphQL server that's hard-coded to this package
 * NOTE: Allow config setup for this later
 */

export const QUERY_EXPIRE_TIMES = {
  __default: 5.4e+6, // 1.5 hours
  // 6.48e+7, // 18 hours
} as {
  [key: string]: number;
};

export const RULES = {
  // __limit: 8000, // 8000: approximately 5.15 MB; calculated at 644.666666668 bytes for 30 objects
  __limit: 100000, // 12000: approximately 7.725 MB; calculated at 644.666666668 bytes for 30 objects
  // __limit: 50, // 12000: approximately 7.725 MB; calculated at 644.666666668 bytes for 30 objects

  // All fragments are cached,
  // but if you want to skip some, add it here
  accountAuthFragment: false,

  // List of queries that should be cached
  // NOTE: Fragments are always cached
  aiChat: true,
  aiChatMessages: true,
  aiChats: true,
  alerts: true,
  chat: true,
  chatsList: true,
  childOrganizations: true,
  dataTable: true,
  dataTableRows: true,
  dataTableRowsForSheetRegions: true,
  dataTables: true,
  eventAttendanceList: true,
  eventsList: true,
  integrationConnection: true,
  logEntry: true,
  logEntries: true,
  logEntriesForReport: true,
  myChats: true,
  myOrganizations: true,
  organizationMembers: true,
  organizationRelationship: true,
  organizationSites: true,
  parentOrganization: true,
  platformProducts: true,
  report: true,
  reportGroups: true,
  reports: true,
  reportSubmissions: true,
  searchUsers: true,
  sheet: true,
  sheetFormulaReferences: true,
  sheetGrid: true,
  sheets: true,
  updateNote: true,
  userIdToChatId: true,
  workflows: true,
} as {
  __limit: number;
  [key: string]: boolean | number;
};

export const PARTIALS_MAP = {
  // Partial fragments are supported if you map them to its original fragment name
  dataTablePartialFragment: 'dataTableFragment',
} as Record<string, string>;
