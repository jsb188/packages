import type { UseMutationParams } from '@jsb188/graphql/types.d';
import type { OpenModalPopUpFn } from '@jsb188/react/states';
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

  const [editInboundContact, mtnValues, mtnHandlers] = useMutation(editInboundContactMtn, {
    openModalPopUp,
    onCompleted: (data, error, variables) => {
      const updatedInboundContact = data?.editInboundContact;

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
