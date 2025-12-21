
/**
 * Rules for GraphQL server that's hard-coded to this package
 * NOTE: Allow config setup for this later
 */

export const QUERY_EXPIRE_TIMES = {
  __default: 3.6e+6, // 1 hour
  // 6.48e+7, // 18 hours
} as {
  [key: string]: number;
};

export const RULES = {
  // __limit: 8000, // 8000: approximately 5.15 MB; calculated at 644.666666668 bytes for 30 objects
  __limit: 100000, // 12000: approximately 7.725 MB; calculated at 644.666666668 bytes for 30 objects
  // __limit: 50, // 12000: approximately 7.725 MB; calculated at 644.666666668 bytes for 30 objects

  // List of queries that should be cached
  // NOTE: Fragments are always cached
  aiChat: true,
  aiChats: true,
  aiChatMessages: true,
  alerts: true,
  chat: true,
  chatsList: true,
  childOrganizations: true,
  eventsList: true,
  eventAttendanceList: true,
  parentOrganization: true,
  friend: true,
  logEntries: true,
  myChats: true,
  myOrganizations: true,
  organizationRelationship: true,
  organizationWorkflows: true,
  platformProducts: true,
  productAttendanceList: true,
  productsList: true,
  reports: true,
  reportSubmissions: true,
  searchUsers: true,
  updateNote: true,
  userIdToChatId: true,

  // All fragments are cached,
  // but if you want to skip some, add it here
  accountAuthFragment: false,
} as {
  __limit: number;
  [key: string]: boolean | number;
};

export const PARTIALS_MAP = {
  // Partial fragments are supported if you map them to its original fragment name
  chatPartial: 'chatFragment',
  chatStatusPartial: 'chatFragment',
} as Record<string, string>;
