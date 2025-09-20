
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
  cardsForUser: true,
  chat: true,
  chatsList: true,
  organizationEvents: true,
  childOrganizations: true,
  parentOrganization: true,
  editChat: true,
  friend: true,
  logEntries: true,
  myChats: true,
  organizationRelationship: true,
  platformProducts: true,
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
  userPartial: 'userFragment',
} as Record<string, string>;
