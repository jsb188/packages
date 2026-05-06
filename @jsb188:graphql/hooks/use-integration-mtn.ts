import type { UseMutationParams } from '@jsb188/graphql/types.d';
import type { OpenModalPopUpFn } from '@jsb188/react/states';
import {
  createIntegrationAuthorizationUrlMtn,
  createSquarePaymentRequestMtn,
  disconnectIntegrationMtn,
} from '../gql/mutations/integrationMutations.ts';
import { useMutation } from './index.ts';

/**
 * Create integration OAuth authorization URL.
 */
export function useCreateIntegrationAuthorizationUrl(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
  const [createIntegrationAuthorizationUrl, mtnValues, mtnHandlers] = useMutation(createIntegrationAuthorizationUrlMtn, {
    openModalPopUp,
    ...params,
  });

  return {
    createIntegrationAuthorizationUrl,
    ...mtnValues,
    ...mtnHandlers,
  };
}

/**
 * Disconnect an integration.
 */
export function useDisconnectIntegration(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
  const { onCompleted, ...otherParams } = params;
  const [disconnectIntegration, mtnValues, mtnHandlers, updateObservers] = useMutation(disconnectIntegrationMtn, {
    openModalPopUp,
    onCompleted: (data: any, error: any, variables: any) => {
      if (data?.disconnectIntegration) {
        updateObservers({
          queryId: '#integrationConnection:',
          forceRefetch: true,
        });
      }

      onCompleted?.(data?.disconnectIntegration, error, variables);
    },
    ...otherParams,
  });

  return {
    disconnectIntegration,
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
