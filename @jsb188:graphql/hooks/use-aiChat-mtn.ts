import { resetQuery, updateQuery } from '../cache/';
import { useMutation } from '../client';
import { updateAIChats } from './use-aiChat-qry';
import { sendAIChatMessageMtn, startAIChatMtn, stopAIChatMessageMtn } from '../gql/mutations/aiChatMutations';
import type { UseMutationParams } from '../types.d';
import { useOpenModalPopUp } from '@jsb188/react/states';
import { useEffect, useRef } from 'react';

/**
 * Start AI chat
 */

export function useStartAIChat(params: UseMutationParams = {}) {

  const { onCompleted, onError } = params;
  const openModalPopUp = useOpenModalPopUp();

  const [startAIChat, mtnValues,, updateObservers] = useMutation(
    startAIChatMtn,
    {
      openModalPopUp,
      onCompleted: (data: any, err: any, variables: any) => {
        onCompleted?.(data, err, variables);

        const aiChat = data.startAIChat?.node;
        updateAIChats(aiChat, updateObservers);
      },
      onError,
    },
  );

  return {
    startAIChat,
    ...mtnValues,
  };
}

/**
 * Send a new message to AI Chat
 */

export function useAIChatTextarea(variablesKey: string, params: UseMutationParams = {}) {

  const { onCompleted, onError } = params;
  const didSendRef = useRef(false);
  const openModalPopUp = useOpenModalPopUp();

  // Send AI chat message

  const [sendAIChatMessage, mtnValues1,, updateObservers] = useMutation(
    sendAIChatMessageMtn,
    {
      openModalPopUp,
      onCompleted: (data: any, err: any, variables: any) => {
        didSendRef.current = true;

        onCompleted?.(data, err, variables);

        const aiChatId = variables.aiChatId;
        const messageId = data.sendAIChatMessage?.node?.id;

        if (messageId && aiChatId && variablesKey) {
          updateQuery(`#aiChat:${variablesKey}`, (currentData: any) => {
            if (Array.isArray(currentData.messages?.data)) {
              currentData.messages.data.push([`$aiChatMessageFragment:${messageId}`]);
            }
            return currentData;
          }, false, updateObservers);
        } else if (data && !err) {
          console.dev(`Unknown error: {${messageId ? 'aiChatId' : 'messageId'}} was not found.`, 'warning');
        }
      },
      onError,
    },
  );

  // Stop AI chat message

  const [stopAIChatMessage, mtnValues2] = useMutation(
    stopAIChatMessageMtn,
    {
      openModalPopUp,
      onCompleted: (data: any, err: any, variables: any) => {
        onCompleted?.(data, err, variables);
      },
      onError,
    },
  );

  // Reset query on unmount if a message was sent;
  // This fixes an issue where in-progress messages that are stopped midway remain broken
  // as a result of the SSE pipe breaking at unmount.

  useEffect(() => {
    return () => {
      if (didSendRef.current) {
        resetQuery(`#aiChat:${variablesKey}`, true, updateObservers);
      }
    };
  }, []);

  return {
    send: {
      sendAIChatMessage,
      ...mtnValues1,
    },
    stop: {
      stopAIChatMessage,
      ...mtnValues2,
    }
  };
}
