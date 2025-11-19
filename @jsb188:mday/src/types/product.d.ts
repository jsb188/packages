import { PRODUCT_LIVESTOCK_STATUS, PRODUCT_LIVESTOCK_TYPES, PRODUCT_TYPES } from '@jsb188/app/constants/product';
import type { AccountData } from '@jsb188/app/types/account.d';
import type { OrganizationData, OrganizationGQL } from '@jsb188/app/types/organization.d';
import type { AddressObj, ScheduleObj } from '@jsb188/app/types/other.d';

/**
 * Enums
 */

export type ProductTypeEnum = typeof PRODUCT_TYPES[number];
export type ProductLivestockTypeEnum = typeof PRODUCT_LIVESTOCK_TYPES[number];
export type ProductLivestockStatusEnum = typeof PRODUCT_LIVESTOCK_STATUS[number];

/**
 * Filters
 */

export interface ProductsFilterArgs {
	preset?: '?' | null;
	productType: ProductTypeEnum;
	query?: string | null;
	timeZone?: string | null; // Server only for now
	// status: ProductLivestockStatusEnum;
}

/**
 * Product details; Livestock
 */

export interface ProductLivestockObj {
  // This interface is not ready yet; old system has to be migrated.
  '?': '?';
}

export interface ProductLivestockData {
	__table: 'products_livestock';
	id?: number | bigint;
	productId: number | bigint;
	type: ProductLivestockTypeEnum;
	status: ProductLivestockStatusEnum;
	birthDate?: string | null; // "YYYY-MM-DD"
	deathDate?: string | null; // "YYYY-MM-DD"
	damIdentifier?: string | null;
	livestockIdentifier: string;
	livestockGroup?: string | null;
  metadata: {
    overview: string;
  }
}

export interface ProductLivestockGQL {
  __typename: 'ProductLivestock';

	id: string;
	organizationId: string;
	damIdentifier: string | null;
	livestockIdentifier: string | null;
	livestockGroup: string | null;

	type: ProductLivestockTypeEnum;
	status: ProductLivestockStatusEnum;
	livestockClass: string;

	birthDate: string | null; // "YYYY-MM-DD"
	deathDate: string | null; // "YYYY-MM-DD"
}

/**
 * Product details; Calendar event
 */

export interface ProductCalEventObj {
	name: string;
	metadata: Partial<{
		schedule: ScheduleObj | null;
		address: Partial<AddressObj> | null;
	}>;

	startAt: Date | string; // ISO Date string
	endAt?: Date | string | null; // ISO Date string
}

export interface ProductCalEventData extends ProductCalEventObj {
	__table: 'products_calendar_events';
	productId: number | bigint;
}

export interface ProductCalEventGQL {
  __typename: 'ProductCalEvent';

	id: string;
	organizationId: string;

	name: string;
	schedule: ScheduleObj | null;
	address: AddressObj | null;
	startAt: Date;
	endAt: Date;
}

export type ProductDetailsObj = ProductLivestockObj | ProductCalEventObj;
export type ProductDetailsData = ProductLivestockData | ProductCalEventData;
export type ProductDetailsGQL = ProductLivestockGQL | ProductCalEventGQL;

/**
 * Product event attendance
 */

export interface ProductAttendanceObj {
  productId: number | bigint;
	organizationId: number | bigint;
	accountId: number | bigint;
	attended: boolean | null;
	calDate: string; // "YYYY-MM-DD" format
	history?: [string, '0' | '1'][] | null; // [YYYY-MM-DD, '0' | '1'][]
}

export interface ProductAttendanceData extends ProductAttendanceObj {
	__table: 'products_attendance';
	organization: OrganizationData;
	account: AccountData; // account data
}

export interface ProductAttendanceGQL {
	__deleted: boolean; // For client-side only
	id: string;
	productId: string;
  organizationId: string;
	attended: boolean | null;
	calDate: string; // "YYYY-MM-DD" format
	organization: OrganizationGQL;
	checkedBy: any; // account data
}

/**
 * Product data objects
 */

export interface ProductData {
	__table: 'products';
	productId: number | bigint;
	organizationId: number | bigint;
	details: ProductDetailsData;
	createdAt: Date;
	updatedAt: Date;
}

export interface ProductGQL {
	__deleted?: boolean; // For client-side only

	id: string;
	organizationId: string;
	cursor: string | null; // Cursor for pagination
	details: ProductDetailsGQL | null;

	createdAt: string; // ISO Date
	updatedAt: string; // ISO Date
}
