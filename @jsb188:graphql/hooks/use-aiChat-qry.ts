import { getENVVariable } from '@jsb188/app';
import { getAuthToken } from '@jsb188/app/utils/api';
import SSE from '@jsb188/sse';
import { useEffect, useState } from 'react';
import { loadFragment } from '../cache/';
import { useQuery } from '../client';
import { aiChatMessagesQry, aiChatQry, aiChatsQry } from '../gql/queries/aiChatQueries';
import handleSSEData, { type PublishPayload } from '../sse';
import type { UseQueryParams } from '../types.d';

/**
 * Constants
 */

const AI_CHATS_LIMIT = 100; // Must match server code exactly
const AI_CHAT_MESSAGES_LIMIT = 100; // Must match server code exactly

/**
 * Helper; get generating (status) key from SSE data
 */

function getGeneratingFragmentId(sseData: PublishPayload) {
  const { __type, dataFragmentKey, fragmentKey, fragmentNamespace, data } = sseData;
  const finished = data?.finished;

  if (__type === 'CONNECTED') {
    return null;
  }

  const fragmentName = '$aiChatMessageFragment:';

  if (typeof finished === 'boolean') {
    if (dataFragmentKey?.startsWith(fragmentName) ) {
      return finished ? null : dataFragmentKey;
    } else if (fragmentKey?.startsWith(fragmentName)) {
      return finished ? null : fragmentKey;
    }
  } else if (
    fragmentKey?.startsWith(fragmentName) &&
    fragmentNamespace === 'text'
  ) {
    return fragmentKey;
  }
}

/**
 * Fetch AI chat
 */

export function useAIChatWithSSE(aiChatId?: string, initialSessionKey?: string | null, params: UseQueryParams = {}) {

  const { data, ...other } = useQuery(aiChatQry, {
    variables: {
      aiChatId
    },
    skip: !aiChatId,
    ...params,
  });

  const { updateObservers } = other;
  const [sessionKey, setSessionKey] = useState<string | null>(initialSessionKey || null);
  const [generatingFragmentId, setGeneratingFragmentId] = useState<string | null>(null);
  const aiChat = data?.aiChat || loadFragment(`$aiChatFragment:${aiChatId}`);
  const dataAIChatId = aiChat?.id;

  useEffect(() => {
    // Browser has too many issues such as proxy, network, roadblocks
    // that make it unreliable to use perpetual SSE in production.
    // So we have to write the logic to make it work without perpetual session.

    if (dataAIChatId && sessionKey) {
      // Only listen to events if data is loaded
      const connection = new SSE({
        host: getENVVariable('SSE_SERVER') as string,
        path: `page_events/ai_chat/${dataAIChatId}`,
        // path: 'test-sse',
        searchParams: {
          session_key: sessionKey,
          auth_token: getAuthToken()
        }
      });

      const connectParams = {
        onMessage: (sseData: PublishPayload) => {
          handleSSEData(sseData, updateObservers);

          const nextValue = getGeneratingFragmentId(sseData);
          if (nextValue === null || typeof nextValue === 'string') {
            setGeneratingFragmentId(nextValue);
          }
        },
        onError: () => {
          setGeneratingFragmentId(null);
        }
      };

      connection.connect(connectParams);

      // const removeNetworkListeners = reconnectOnBrowserNetwork(connection, connectParams);

      return () => {
        connection.close();
        // removeNetworkListeners();
      };
    }
  }, [dataAIChatId, sessionKey]);

  return {
    aiChat,
    generatingFragmentId,
    sessionKey,
    setSessionKey,
    ...other
  };
}

/**
 * Fetch AI chat messages
 */

export function useAIChatMessages(aiChatId?: string, params: UseQueryParams = {}) {

  const { data, ...other } = useQuery(aiChatMessagesQry, {
    variables: {
      aiChatId,
      cursor: null,
      after: true,
      limit: AI_CHAT_MESSAGES_LIMIT
    },
    // If this query is used for virtualized list pagination, set {params.skip=true}
    skip: !aiChatId,
    ...params,
  });

  return {
    aiChatMessages: data?.aiChatMessages,
    ...other
  };
}

/**
 * Fetch AI chats list
 */

  export function useAIChats(filter?: 'CAL_DATE' | 'CHATS') {
  const { data, ...other } = useQuery(aiChatsQry, {
    variables: {
      filter,
      cursor: null,
      after: false,
      limit: AI_CHATS_LIMIT
    },
    skip: false,
  });

  return {
    aiChats: data?.aiChats,
    ...other
  };
}
