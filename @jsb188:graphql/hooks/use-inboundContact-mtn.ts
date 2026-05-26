import type { UseMutationParams } from '@jsb188/graphql/types.d';
import type { OpenModalPopUpFn } from '@jsb188/react/states';
import { updateFragment } from '../cache/index.ts';
import { editInboundContactMtn } from '../gql/mutations/inboundContactMutations.ts';
import { useMutation } from './index.ts';

/**
 * Edit one inbound contact memory record.
 */

export function useEditInboundContact(
  params: UseMutationParams = {},
  openModalPopUp?: OpenModalPopUpFn,
) {
  const { onCompleted, ...rest } = params;

  const [editInboundContact, mtnValues, mtnHandlers, updateObservers] = useMutation(editInboundContactMtn, {
    openModalPopUp,
    onCompleted: (data, error, variables) => {
      const updatedInboundContact = data?.editInboundContact;

      if (updatedInboundContact?.id) {
        updateFragment(
          `$inboundContactFragment:${updatedInboundContact.id}`,
          updatedInboundContact,
          null,
          false,
          updateObservers
        );
      }

      onCompleted?.(updatedInboundContact, error, variables);
    },
    ...rest,
  });

  return {
    editInboundContact,
    ...mtnValues,
    ...mtnHandlers,
  };
}
