export type PageRouteQueryEnum = 'LOG_ENTRIES' | 'CHILD_ORGANIZATIONS';

export interface PageRouteLogEntriesFilterObj {
	siteId?: number | string | null;
	preset?: string | null;
	types?: string[] | null;
	activities?: string[] | null;
	startDate?: string | null;
	endDate?: string | null;
	query?: string | null;
}

export interface PageRouteChildOrgsFilterObj {
	childOrgIds?: (number | string)[] | null;
	affiliated?: boolean | null;
}

export interface PageRouteFiltersObj {
	logEntries?: PageRouteLogEntriesFilterObj | null;
	childOrgs?: PageRouteChildOrgsFilterObj | null;
}

export interface OrganizationPageRouteData {
	id: number | bigint;
	organizationId: number | bigint;
	slug: string;
	query: PageRouteQueryEnum;
	filters: PageRouteFiltersObj;
	columns: string[];
	iconName?: string | null;
	starred: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface OrgPageRouteGQL {
	id: string;
	organizationId: string;
	slug: string;
	query: PageRouteQueryEnum;
	logEntriesFilter?: PageRouteLogEntriesFilterObj | null;
	childOrgsFilter?: PageRouteChildOrgsFilterObj | null;
	columns: string[];
	iconName?: string | null;
	starred?: boolean | null;
	createdAt?: string | null;
	updatedAt?: string | null;
}
