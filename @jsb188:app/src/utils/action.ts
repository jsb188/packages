import type { ActionCategoryEnum } from '@jsb188/mday/types/action.d';
import type { LogActivityEnum } from '@jsb188/mday/types/log.d';
import type { OrganizationOperationEnum } from '../types/organization.d.ts';

/**
 * Enums
 */

export const ACTION_STATUS_ENUMS = [
	'SCHEDULED',
	'STARTED',
	'COMPLETED',
	'ERRORED',
];

/**
 * Get aggregated action types to log activities
 */

export function getAggregatedActivities(
  operation: OrganizationOperationEnum,
  actionCategory: ActionCategoryEnum,
): LogActivityEnum[] {

  return [
    'MARKET_CREDIT_RECEIPT',
  ];
}
