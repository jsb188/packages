import i18n from '@jsb188/app/i18n/index.ts';
import type { OrganizationGQL } from '@jsb188/mday/types/organization.d.ts';
import { COMMON_ICON_NAMES } from '@jsb188/react-web/svgs/Icon';

/**
 * Get all title icons for organization/vendor
 * @param org - Organization GQL data
 * @param showIconsRule - Rules for which icons to show/not-show
 * @returns Array of icon label objects with icon name and tooltip text
 */

export function getTitleIconsForOrganization(
	org: OrganizationGQL,
	showIconsRule: Record<string, boolean> = {},
) {
	const { operation, compliance } = org;
	const titleIcons = [];

	if (operation && showIconsRule.operation !== false) {
		titleIcons.push({
			iconName: COMMON_ICON_NAMES[operation] || 'info-circle',
			tooltipText: i18n.t(`org.type.${operation}`),
		});
	}

	if (compliance?.length && showIconsRule.compliance !== false) {
		const today = new Date();
		const todayCalDate = today.toISOString().split('T')[0];
		const notExpired = compliance.filter((item: any) => item.expirationDate && item.expirationDate > todayCalDate);

		if (notExpired.length > 0) {
			titleIcons.push({
				iconName: 'document-license',
				tooltipText: notExpired.map((item: any) => item.name).join(', '),
			});
		}
	}

	return titleIcons;
}
