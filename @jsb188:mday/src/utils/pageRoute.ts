import {
	PAGE_ROUTE_MAX_COLUMNS,
	PAGE_ROUTE_QUERY_ENUMS,
	PAGE_ROUTE_RESERVED_SLUGS,
	PAGE_ROUTE_SLUG_MAX_LENGTH,
	PAGE_ROUTE_SLUG_MIN_LENGTH,
} from '../constants/pageRoute.ts';
import { isValidTableRouteColumnSettingsKey } from './table-route.ts';

/*
 * Normalize free-form input into a page route slug candidate.
 */
export function normalizePageRouteSlug(value?: string | null) {
	return String(value || '').trim().toLowerCase();
}

/*
 * Return whether a normalized page route slug is valid and not reserved.
 */
export function isValidPageRouteSlug(slug?: string | null) {
	return !!slug &&
		slug.length >= PAGE_ROUTE_SLUG_MIN_LENGTH &&
		slug.length <= PAGE_ROUTE_SLUG_MAX_LENGTH &&
		/^[a-z0-9_-]+$/.test(slug) &&
		!PAGE_ROUTE_RESERVED_SLUGS.includes(slug);
}

/*
 * Return whether a value is a supported page route query name.
 */
export function isValidPageRouteQuery(value?: string | null) {
	return !!value && PAGE_ROUTE_QUERY_ENUMS.includes(value);
}

/*
 * Return a unique, charset-validated page route column key list; null when any key is invalid.
 */
export function getPageRouteColumnsFromInput(columns?: string[] | null) {
	if (!Array.isArray(columns)) {
		return null;
	}

	const seenColumnKeys = new Set<string>();
	const columnKeys = columns.reduce((acc, value) => {
		const columnKey = String(value || '');

		if (!isValidTableRouteColumnSettingsKey(columnKey) || seenColumnKeys.has(columnKey)) {
			return acc;
		}

		seenColumnKeys.add(columnKey);
		acc.push(columnKey);
		return acc;
	}, [] as string[]);

	if (columnKeys.length !== columns.length || columnKeys.length > PAGE_ROUTE_MAX_COLUMNS) {
		return null;
	}

	return columnKeys;
}
