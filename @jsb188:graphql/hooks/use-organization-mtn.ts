import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { OpenModalPopUpFn, useCurrentAccount } from '@jsb188/react/states';
import { updateFragment } from '../cache/index';
import { deleteComplianceDocumentMtn, editMembershipMtn, editOrganizationMtn, removeMembershipMtn, switchOrganizationMtn } from '../gql/mutations/organizationMutations';
import { useMutation } from './index';
import { useOrgRelFromMyOrganizations } from './use-organization-qry';
import { useMemo } from 'react';
import { checkACLPermission } from '@jsb188/mday/utils/organization.ts';

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

/**
 * Delete a compliance document
 */

export function useDeleteComplianceDocument(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
  const { onCompleted, ...otherParams } = params;

  const [deleteComplianceDocument, mtnValues, mtnHandlers, updateObservers] = useMutation(deleteComplianceDocumentMtn,
    {
      // checkMountedBeforeCallback: true,
      openModalPopUp,
      onCompleted: (data, error, variables) => {
        const deleted = data?.deleteComplianceDocument;
        if (deleted) {
          updateFragment(`$organizationComplianceFragment:${variables.complianceId}`, { __deleted: true }, null, false, updateObservers);
        }

        onCompleted?.(deleted, error);
      },
      ...otherParams,
    }
  );

  return {
    deleteComplianceDocument,
    ...mtnValues,
    ...mtnHandlers,
  };
}

/**
 * Edit logged in user's organization (if allowed)
 */

export function useEditOrganization(
  params?: UseMutationParams | null,
  openModalPopUp?: OpenModalPopUpFn
) {
  const { primaryOrganizationId } = useCurrentAccount();
  const { organizationRelationship } = useOrgRelFromMyOrganizations(primaryOrganizationId);
	const allowEdit = useMemo(() =>
		checkACLPermission(organizationRelationship, 'orgManagement', 'MANAGE'),
		[organizationRelationship?.acl, organizationRelationship?.role]
	);

  const [editOrganization, mtnValues, mtnHandlers] = useMutation(editOrganizationMtn, {
    // checkMountedBeforeCallback: true,
    openModalPopUp,
    ...params,
  });

  return {
    allowEdit,
    organizationRelationship,
    editOrganization,
    ...mtnValues,
    ...mtnHandlers,
  };
}

/**
 * Edit a membership on an organization
 */

export function useEditMembership(
  params: UseMutationParams = {},
  openModalPopUp?: OpenModalPopUpFn
) {
  const { onCompleted, ...rest } = params;

  const [editMembership, mtnValues, mtnHandlers, updateObservers] = useMutation(editMembershipMtn, {
    openModalPopUp,
    onCompleted: (data, error, variables) => {
      const updatedMembership = data?.editMembership;

      if (updatedMembership?.id) {
        updateFragment(
          `$organizationRelationshipFragment:${updatedMembership.id}`,
          updatedMembership,
          null,
          false,
          updateObservers
        );
      }

      onCompleted?.(updatedMembership, error, variables);
    },
    ...rest,
  });

  return {
    editMembership,
    ...mtnValues,
    ...mtnHandlers,
  };
}

/**
 * Remove a membership on an organization
 */

export function useRemoveMembership(
  params: UseMutationParams = {},
  openModalPopUp?: OpenModalPopUpFn
) {
  const { onCompleted, ...rest } = params;

  const [removeMembership, mtnValues, mtnHandlers, updateObservers] = useMutation(removeMembershipMtn, {
    openModalPopUp,
    onCompleted: (data, error, variables) => {
      const removed = data?.removeMembership;
      if (removed) {
        updateFragment(`$organizationRelationshipFragment:${variables.membershipId}`, { __deleted: true }, null, false, updateObservers);
      }
      onCompleted?.(removed, error, variables);
    },
    ...rest,
  });

  return {
    removeMembership,
    ...mtnValues,
    ...mtnHandlers,
  };
}
