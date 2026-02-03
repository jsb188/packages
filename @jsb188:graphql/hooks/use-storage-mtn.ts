import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { OpenModalPopUpFn } from '@jsb188/react/states';
import { updateFragment } from '../cache/index';
import { createSignedUploadUrlMtn, deleteStorageFileMtn } from '../gql/mutations/storageMutations';
import { useMutation } from './index';

/**
 * Get signed URL for file uploads
 */

export function useCreateSignedUploadUrl(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {

  const [createSignedUploadUrl, mtnValues, mtnHandlers, updateObservers] = useMutation(
    createSignedUploadUrlMtn,
    {
      openModalPopUp,
      ...params,
    },
  );

  return {
    createSignedUploadUrl,
    updateObservers,
    ...mtnValues,
    ...mtnHandlers,
  };
}

/**
 * Delete a storage file
 */

export function useDeleteStorageFile(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {

  const { onCompleted, ...rest } = params;
  const [deleteStorageFile, mtnValues, mtnHandlers, updateObservers] = useMutation(
    deleteStorageFileMtn,
    {
      openModalPopUp,
      onCompleted: (data, dataMtnValues, variables) => {
        if (data?.deleteStorageFile) {
          updateFragment(`$storageFileFragment:${variables.fileUri}`, { __deleted: true }, null, false, updateObservers);
        }
        onCompleted?.(data, dataMtnValues, variables);
      },
      ...rest,
    },
  );

  return {
    deleteStorageFile,
    updateObservers,
    ...mtnValues,
    ...mtnHandlers,
  };
}
