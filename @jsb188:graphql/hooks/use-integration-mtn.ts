import type { UseMutationParams } from '@jsb188/graphql/types.d';
import type { OpenModalPopUpFn } from '@jsb188/react/states';
import { updateFragment } from '../cache/index.ts';
import {
  createIntegrationAuthorizationUrlMtn,
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
      const disconnectedIntegrationId = data?.disconnectIntegration;

      if (disconnectedIntegrationId) {
        const organizationFragmentKey = `$organizationFragment:${variables.organizationId}`;

        updateFragment(
          `$integrationConnectionFragment:${disconnectedIntegrationId}`,
          { status: 'DISCONNECTED' },
          null,
          false,
          updateObservers,
          [organizationFragmentKey],
        );
      }

      onCompleted?.(disconnectedIntegrationId, error, variables);
    },
    ...otherParams,
  });

  return {
    disconnectIntegration,
    ...mtnValues,
    ...mtnHandlers,
  };
}
