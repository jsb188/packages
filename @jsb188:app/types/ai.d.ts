
// AI chat types

export type AIChatMessageType = 'MESSAGE' | 'SMS' | 'FUNCTION_CALL'| 'FUNCTION_CALL_OUTPUT';

// AI events

export type AIEventErrorName =
  | 'AI_EVENT_UNKNOWN_ERR'
  | 'AI_EVENT_DEVELOPER_ERR'
  | 'AI_EVENT_NO_ACCESS'
  | 'AI_COULD_NOT_RESOLVE'
  | 'AI_CONTEXT_ERR'
  | 'AI_ORG_ACL_FAILED'
  | 'SETUP_INCOMPLETE_ORG'
  | 'MISSING_API_KEY'
  | 'LLM_PROVIDER_NOT_FOUND'
  | 'MODERATION_MISSING'
  | 'MODERATION_SERVICE_ERR'
  | 'UNKNOWN_LLM_ERR'
  | 'UNFINISHED_LOGIC';

// AI chat

export interface AIChatObj {
  id: string;
  calDate: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}
