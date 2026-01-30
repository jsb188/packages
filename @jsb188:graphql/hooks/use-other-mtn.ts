import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { OpenModalPopUpFn } from '@jsb188/react/states';
import { getSignedUploadUrlMtn } from '../gql/mutations/otherMutations';
import { useMutation } from './index';

/**
 * Get signed URL for file uploads
 */

export function useGetSignedUploadUrl(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {

  const [getSignedUploadUrl, mtnValues, mtnHandlers] = useMutation(
    getSignedUploadUrlMtn,
    {
      openModalPopUp,
      ...params,
    },
  );

  return {
    getSignedUploadUrl,
    ...mtnValues,
    ...mtnHandlers,
  };
}
