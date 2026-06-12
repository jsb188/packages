export const TABLE_ROUTE_COLUMN_MIN_WIDTH = 50;
export const TABLE_ROUTE_COLUMN_MAX_WIDTH = 800;

export type TableRouteColumnWidths = Record<string, number>;
export type TableRouteColumnOrder = string[];

export interface OrganizationRouteSettingsObj {
	columnWidths?: TableRouteColumnWidths | null;
	columnOrder?: TableRouteColumnOrder | null;
}

/*
 * Keep a user-resized route table column width inside a practical range.
 */
export function clampTableRouteColumnWidth(width: number) {
	return Math.min(TABLE_ROUTE_COLUMN_MAX_WIDTH, Math.max(TABLE_ROUTE_COLUMN_MIN_WIDTH, Math.round(width)));
}

/*
 * Return whether a route table column key can be safely stored in settings JSONB.
 */
export function isValidTableRouteColumnSettingsKey(value: string | null | undefined) {
	return !!value && /^[A-Za-z0-9_-]+$/.test(value);
}

/*
 * Return whether a table route id can be safely stored in settings JSONB.
 */
export function isValidTableRouteIdSettingsKey(value: string | null | undefined) {
	return !!value && /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(value);
}

/*
 * Return the app route id used for organization table settings.
 */
export function getTableRouteIdFromPathname(pathname: string, fallbackRouteId = 'table') {
	const segments = pathname.split('/').filter(Boolean);
	const routeSegments = segments[0] === 'app' ? segments.slice(1) : segments;
	const routeId = routeSegments.join('/');

	return isValidTableRouteIdSettingsKey(routeId) ? routeId : fallbackRouteId;
}

/*
 * Return the route id from an OrgRoute cursor shaped as [organizationId, 0, routeId].
 */
export function getTableRouteIdFromOrgRouteCursor(cursor: string | null | undefined) {
	const routeId = String(cursor || '').split(':')[2];

	return isValidTableRouteIdSettingsKey(routeId) ? routeId : null;
}

/*
 * Convert GraphQL OrgRoute column width strings into a keyed width object.
 */
export function getTableRouteColumnWidthsFromStrings(values: string[] | null | undefined) {
	if (!Array.isArray(values)) {
		return {};
	}

	const widths: TableRouteColumnWidths = {};

	for (const value of values) {
		const parts = String(value || '').split(':');
		const [columnKey, widthValue] = parts;
		const width = Number(widthValue);

		if (parts.length !== 2 || !isValidTableRouteColumnSettingsKey(columnKey) || !Number.isFinite(width)) {
			continue;
		}

		widths[columnKey] = clampTableRouteColumnWidth(width);
	}

	return widths;
}

/*
 * Convert a keyed column width object into GraphQL OrgRoute width strings.
 */
export function getTableRouteColumnWidthStrings(widths: TableRouteColumnWidths | null | undefined) {
	if (!widths) {
		return [];
	}

	return Object.entries(widths).reduce((acc, [columnKey, width]) => {
		if (!isValidTableRouteColumnSettingsKey(columnKey) || !Number.isFinite(width)) {
			return acc;
		}

		acc.push(`${columnKey}:${clampTableRouteColumnWidth(width)}`);
		return acc;
	}, [] as string[]);
}

/*
 * Return a unique ordered column key list from GraphQL route settings values.
 */
export function getTableRouteColumnOrderFromStrings(values: string[] | null | undefined) {
	if (!Array.isArray(values)) {
		return [];
	}

	const seenColumnKeys = new Set<string>();

	return values.reduce((acc, value) => {
		const columnKey = String(value || '');

		if (!isValidTableRouteColumnSettingsKey(columnKey) || seenColumnKeys.has(columnKey)) {
			return acc;
		}

		seenColumnKeys.add(columnKey);
		acc.push(columnKey);
		return acc;
	}, [] as TableRouteColumnOrder);
}

/*
 * Convert an ordered column key list into GraphQL OrgRoute order strings.
 */
export function getTableRouteColumnOrderStrings(columnOrder: TableRouteColumnOrder | null | undefined) {
	return getTableRouteColumnOrderFromStrings(columnOrder);
}

/*
 * Return a complete column order from saved keys and the current table design keys.
 */
export function getTableRouteColumnOrderFromColumnKeys(columnKeys: string[], columnOrder: TableRouteColumnOrder | null | undefined) {
	const validColumnKeys = columnKeys.filter(isValidTableRouteColumnSettingsKey);
	const validColumnKeySet = new Set(validColumnKeys);
	const seenColumnKeys = new Set<string>();
	const orderedColumnKeys = getTableRouteColumnOrderFromStrings(columnOrder).reduce((acc, columnKey) => {
		if (!validColumnKeySet.has(columnKey) || seenColumnKeys.has(columnKey)) {
			return acc;
		}

		seenColumnKeys.add(columnKey);
		acc.push(columnKey);
		return acc;
	}, [] as TableRouteColumnOrder);

	validColumnKeys.forEach((columnKey) => {
		if (!seenColumnKeys.has(columnKey)) {
			orderedColumnKeys.push(columnKey);
		}
	});

	return orderedColumnKeys;
}

/*
 * Convert a settings routes object into one GraphQL-friendly route settings list.
 */
export function getOrganizationSettingsRoutesList(
	routes: Record<string, OrganizationRouteSettingsObj> | null | undefined,
) {
	if (!routes) {
		return [];
	}

	return Object.entries(routes)
		.filter(([routeId]) => isValidTableRouteIdSettingsKey(routeId))
		.map(([routeId, route]) => ({
			routeId,
			columnWidths: route?.columnWidths || {},
			columnOrder: getTableRouteColumnOrderStrings(route?.columnOrder),
		}));
}

/*
 * Return route column widths from GraphQL OrganizationSettings.routes data.
 */
export function getTableRouteColumnWidthsFromSettingsRoutes(
	routes: { id?: string | null; columnWidths?: string[] | null }[] | null | undefined,
	routeId: string,
) {
	const route = routes?.find((item) => getTableRouteIdFromOrgRouteCursor(item?.id) === routeId);

	return getTableRouteColumnWidthsFromStrings(route?.columnWidths);
}

/*
 * Return route column order from GraphQL OrganizationSettings.routes data.
 */
export function getTableRouteColumnOrderFromSettingsRoutes(
	routes: { id?: string | null; columnOrder?: string[] | null }[] | null | undefined,
	routeId: string,
) {
	const route = routes?.find((item) => getTableRouteIdFromOrgRouteCursor(item?.id) === routeId);

	return getTableRouteColumnOrderFromStrings(route?.columnOrder);
}

/*
 * Keep only local width patches that have not been confirmed by server settings.
 */
export function removeConfirmedTableRouteColumnWidthPatches(
	localWidths: TableRouteColumnWidths,
	serverWidths: TableRouteColumnWidths,
) {
	let nextWidths = localWidths;

	Object.entries(localWidths).forEach(([columnKey, width]) => {
		if (serverWidths[columnKey] !== width) {
			return;
		}

		if (nextWidths === localWidths) {
			nextWidths = { ...localWidths };
		}

		delete nextWidths[columnKey];
	});

	return nextWidths;
}
