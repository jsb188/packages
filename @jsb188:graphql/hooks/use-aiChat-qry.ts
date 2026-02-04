import { getENVVariable } from '@jsb188/app';
import { getAuthToken } from '@jsb188/app/utils/api.ts';
import { makeVariablesKey } from '@jsb188/app/utils/logic.ts';
import SSE from '@jsb188/sse';
import { useEffect, useState } from 'react';
import { loadFragment, loadQuery, resetQuery, updateQuery } from '../cache/';
import { useQuery } from '../client';
import { aiChatMessagesQry, aiChatQry, aiChatsQry } from '../gql/queries/aiChatQueries';
import handleSSEData, { type PublishPayload } from '../sse';
import type { UpdateObserversFn, UseQueryParams } from '../types.d';

/**
 * Constants
 */

const AI_CHATS_LIMIT = 70; // Must match server code exactly
const AI_CHAT_MESSAGES_LIMIT = 55; // Must match server code exactly

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

  const { data, ...rest } = useQuery(aiChatQry, {
    variables: {
      aiChatId
    },
    skip: !aiChatId,
    ...params,
  });

  const { updateObservers } = rest;
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

  useEffect(() => {
    // Every time AIChat is fetched, check if it exists in lists cache
    if (dataAIChatId) {
      const variablesKey = makeVariablesKey({
        filter: aiChat.calDate ? 'CAL_DATE' : 'CHATS',
        cursor: null,
        after: false,
        limit: AI_CHATS_LIMIT
      });

      const queryKey = `#aiChats:${variablesKey}`;
      const queryCache = loadQuery(queryKey);

      if (queryCache) {
        const notFound = queryCache.every((a: any) => a.id !== dataAIChatId);

        if (notFound) {
          // If not found, add to cache
          updateQuery(queryKey, (prev: any) => {
            return [{
              cursor: aiChat.cursor,
              __flat: {
                __cache: true,
                data: [`$aiChatFragment:${dataAIChatId}`],
              }
            }, ...prev];
          }, false, updateObservers);
        }
      }
    }
  }, [dataAIChatId]);

  useEffect(() => {
    // Force reset if chat message is in progress
    if (aiChat?.inProgress) {
      return () => {
        resetQuery(rest.queryKey, true, updateObservers);
      };
    }
  }, [aiChat?.inProgress]);

  return {
    aiChat,
    generatingFragmentId,
    sessionKey,
    setSessionKey,
    ...rest
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
 * Update sidebar AI chats query
 */

export function updateAIChats(aiChat: any, updateObservers: UpdateObserversFn) {
  if (aiChat) {
    const isCalDate = !!aiChat.calDate;
    const queryKey = `#aiChats:$after:false$filter:${isCalDate ? 'cal_date' : 'chats'}$limit:${AI_CHATS_LIMIT}`;

    updateQuery(
      queryKey,
      (res) => {
        return [
          {
            cursor: aiChat.cursor,
            __flat: {
              __cache: true,
              data: [`$aiChatFragment:${aiChat.id}`]
            }
          },
          ...res
        ];
      },
      false,
      updateObservers
    );
  }
}

/**
 * Fetch AI chats list
 */

  export function useAIChats(organizationId: string, filter?: 'CAL_DATE' | 'CHATS') {
  const { data, ...other } = useQuery(aiChatsQry, {
    variables: {
      organizationId,
      filter,
      cursor: null,
      after: false,
      limit: AI_CHATS_LIMIT
    },
    skip: !organizationId,
  });

  return {
    aiChats: data?.aiChats,
    ...other
  };
}
