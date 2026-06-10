import i18n from '@jsb188/app/i18n/index.ts';
import { getFullDate } from '@jsb188/app/utils/datetime.ts';
import type { WorkflowGQL } from '@jsb188/mday/types/workflow.d.ts';
import { getWorkflowShortLabel, isWorkflowActive } from '@jsb188/mday/utils/workflow.ts';
import { COMMON_ICON_NAMES } from '@jsb188/react-web/svgs/Icon';

/*
 * Return the icon name used to represent one workflow trigger.
 */
export function getWorkflowIconName(workflow: WorkflowGQL) {
	return workflow.logType
		? COMMON_ICON_NAMES[workflow.logType]
		: workflow.feature
			? COMMON_ICON_NAMES[workflow.feature]
			: COMMON_ICON_NAMES.general_workflow;
}

/*
 * Return the formatted next run date for one workflow, or a table-friendly empty value.
 */
export function getWorkflowNextRunText(workflow: WorkflowGQL, timeZone: string | null) {
	return workflow.nextAt
		? getFullDate(workflow.nextAt, 'NUMERIC_TIME', timeZone)
		: '-';
}

/*
 * Return the short card description for one workflow's current scheduling state.
 */
export function getWorkflowCardDescription(workflow: WorkflowGQL, timeZone: string | null) {
	if (!isWorkflowActive(workflow)) {
		return i18n.t('form.not_active');
	}

	return workflow.nextAt
		? `${i18n.t('form.next')}: ${getWorkflowNextRunText(workflow, timeZone)}`
		: i18n.t('form.active');
}

/*
 * Return the modal header description for one workflow's current scheduling state.
 */
export function getWorkflowHeaderDescription(workflow: WorkflowGQL, timeZone: string | null) {
	if (!isWorkflowActive(workflow)) {
		return i18n.t('workflow.not_active_msg');
	}

	if (workflow.nextAt) {
		return `${i18n.t('form.next_run')}: ${getWorkflowNextRunText(workflow, timeZone)}`;
	}

	const logTypeShortLabel = workflow.logType
		? getWorkflowShortLabel(workflow)
		: null;

	return i18n.t('workflow.active_msg', { logType: logTypeShortLabel?.toLowerCase() });
}
