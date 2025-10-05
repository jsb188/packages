import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { OpenModalPopUpFn, useCurrentAccount } from '@jsb188/react/states';
// import { useNavigate } from 'react-router';
import { switchOrganizationMtn } from '../gql/mutations/organizationMutations';
import { useMutation } from './index';

/**
 * Fetch a single log entry,
 * from cache first; only check server if cache is not found.
 */

export function useSwitchOrganization(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
  const { onCompleted, ...otherParams } = params;
  // const navigate = useNavigate();
  const { dispatchApp, account, primaryOrganizationId } = useCurrentAccount();

  const [switchOrganization, mtnValues, mtnHandlers] = useMutation(switchOrganizationMtn, {
    // checkMountedBeforeCallback: true,
    openModalPopUp,
    onCompleted: (data, error, variables) => {
      const result = data?.switchOrganization;
      if (result) {
        // navigate('/app', { replace: true });
        dispatchApp({
          __type: 'APP_SWITCH_PRIMARY_ORGANIZATION',
          data: {
            primaryOrganizationId: variables.organizationId,
          }
        })
      }

      onCompleted?.(result, error);
    },
    ...otherParams,
  });

  return {
    switchOrganization,
    ...mtnValues,
    ...mtnHandlers,
  };
}
