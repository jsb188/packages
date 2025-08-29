import { updateQuery } from '../cache/';
import { useMutation } from '../client';
import { updateAIChats } from './use-aiChat-qry';
import { sendAIChatMessageMtn, startAIChatMtn, stopAIChatMessageMtn } from '../gql/mutations/aiChatMutations';
import type { UseMutationParams } from '../types.d';
import { useOpenModalPopUp } from '@jsb188/react/states';

/**
 * Start AI chat
 */

export function useStartAIChat(params: UseMutationParams = {}) {

  const { onCompleted, onError } = params;
  const openModalPopUp = useOpenModalPopUp();

  const [startAIChat, mtnValues] = useMutation(
    startAIChatMtn,
    {
      openModalPopUp,
      onCompleted: (data: any, err: any, variables: any) => {
        onCompleted?.(data, err, variables);

        const aiChat = data.startAIChat?.node;
        console.log('aiChat');
        console.log(aiChat);

        updateAIChats(aiChat);

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
  const openModalPopUp = useOpenModalPopUp();

  // Send AI chat message

  const [sendAIChatMessage, mtnValues1,, updateObservers] = useMutation(
    sendAIChatMessageMtn,
    {
      openModalPopUp,
      onCompleted: (data: any, err: any, variables: any) => {
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
