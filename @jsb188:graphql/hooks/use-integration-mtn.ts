import type { UseMutationParams } from '@jsb188/graphql/types.d';
import type { OpenModalPopUpFn } from '@jsb188/react/states';
import {
  createSquareAuthorizationUrlMtn,
  createSquarePaymentRequestMtn,
  disconnectSquareMtn,
} from '../gql/mutations/integrationMutations';
import { useMutation } from './index';

/**
 * Create Square OAuth authorization URL.
 */
export function useCreateSquareAuthorizationUrl(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
  const [createSquareAuthorizationUrl, mtnValues, mtnHandlers] = useMutation(createSquareAuthorizationUrlMtn, {
    openModalPopUp,
    ...params,
  });

  return {
    createSquareAuthorizationUrl,
    ...mtnValues,
    ...mtnHandlers,
  };
}

/**
 * Disconnect Square integration.
 */
export function useDisconnectSquare(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
  const { onCompleted, ...otherParams } = params;
  const [disconnectSquare, mtnValues, mtnHandlers, updateObservers] = useMutation(disconnectSquareMtn, {
    openModalPopUp,
    onCompleted: (data: any, error: any, variables: any) => {
      if (data?.disconnectSquare) {
        updateObservers({
          queryId: '#squareConnection:',
          forceRefetch: true,
        });
      }

      onCompleted?.(data?.disconnectSquare, error, variables);
    },
    ...otherParams,
  });

  return {
    disconnectSquare,
    ...mtnValues,
    ...mtnHandlers,
  };
}

/**
 * Create a Square-hosted payment request link.
 */
export function useCreateSquarePaymentRequest(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
  const [createSquarePaymentRequest, mtnValues, mtnHandlers] = useMutation(createSquarePaymentRequestMtn, {
    openModalPopUp,
    ...params,
  });

  return {
    createSquarePaymentRequest,
    ...mtnValues,
    ...mtnHandlers,
  };
}
