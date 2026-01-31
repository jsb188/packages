import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { getSignedUploadUrlMtn } from '../gql/mutations/storageMutations';
import { useMutation } from './index';

/**
 * Get signed URL for file uploads
 */

export function useGetSignedUploadUrl(params: UseMutationParams = {}) {

  const [getSignedUploadUrl, mtnValues, mtnHandlers] = useMutation(
    getSignedUploadUrlMtn,
    params,
  );

  return {
    getSignedUploadUrl,
    ...mtnValues,
    ...mtnHandlers,
  };
}
