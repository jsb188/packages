import {
  PRODUCT_EVENT_FREQUENCY,
  PRODUCT_LIVESTOCK_STATUS,
  PRODUCT_LIVESTOCK_TYPES,
  PRODUCT_TYPES
} from '@jsb188/app/constants/product';
import type { AddressObj, ScheduleObj } from '@jsb188/app/types/other.d';
import type { OrganizationData, OrganizationGQL } from '@jsb188/app/types/organization.d.ts';
import type { AccountData } from '@jsb188/app/types/account.d.ts';

/**
 * Enums
 */

export type ProductTypeEnum = typeof PRODUCT_TYPES[number];
export type ProductLivestockTypeEnum = typeof PRODUCT_LIVESTOCK_TYPES[number];
export type ProductLivestockStatusEnum = typeof PRODUCT_LIVESTOCK_STATUS[number];
export type ProductEventFrequencyEnum = typeof PRODUCT_EVENT_FREQUENCY[number];

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
 * Product details base
 */

interface ProductDetailsBase {
	id?: number;
	productId: number;
	metadata: {
		overview: string;
	};
}

/**
 * Product details; Livestock
 */

export interface ProductLivestockObj extends ProductDetailsBase {
	__table: 'products_livestock';
	type: ProductLivestockTypeEnum;
	status: ProductLivestockStatusEnum;
	birthDate?: string | null; // "YYYY-MM-DD"
	deathDate?: string | null; // "YYYY-MM-DD"
	damIdentifier?: string | null;
	livestockIdentifier: string;
	livestockGroup?: string | null;
}

export interface ProductLivestockGQL {
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

export interface ProductCalendarEventObj extends Omit<ProductDetailsBase, 'metadata'> {
	__table: 'products_calendar_events';
	organizationId: number;

	title: string;
	frequency: ProductEventFrequencyEnum;
	metadata: {
		overview: string;
		schedule: ScheduleObj | null;
		address: AddressObj | null;
	};

	startAt: Date;
	endAt: Date;

	createdAt: Date;
	updatedAt: Date;
}

export interface ProductCalendarEventGQL {
	id: string;
	organizationId: string;

	title: string;
	frequency: ProductEventFrequencyEnum;
	schedule: ScheduleObj | null;
	address: AddressObj | null;
	startAt: Date;
	endAt: Date;

	createdAt: Date;
	updatedAt: Date;
}

export type ProductDetailsObj = ProductLivestockObj | ProductCalendarEventObj;
export type ProductDetailsGQL = ProductLivestockGQL | ProductCalendarEventGQL;

/**
 * Product event attendance
 */

export interface ProductAttendanceUpsertObj {
	id?: number; // Only for edits
	organizationId: number;
	eventId: number;
	accountId: number;
	attended: boolean | null;
	calDate: string; // "YYYY-MM-DD" format
	history?: [string, '0' | '1'][] | null; // [YYYY-MM-DD, '0' | '1'][]
}

export interface ProductAttendanceObj extends ProductAttendanceUpsertObj {
	__table: 'products_attendance';
	id: number;
	organization: OrganizationData;
	account: AccountData; // account data
}

export interface ProductAttendanceGQL {
	__deleted: boolean; // For client-side only
	id: string;
	eventId: string;
	attended: boolean | null;
	calDate: string; // "YYYY-MM-DD" format
	organization: OrganizationGQL;
	checkedBy: any; // account data
}

/**
 * Product data object
 */

export interface ProductObj {
	__table: 'products';
	id: number;
	organizationId: number;
	details: ProductDetailsObj | null;

	createdAt: Date;
	updatedAt: Date;
}

/**
 * GraphQL Data
 */

export interface ProductGQL {
  __deleted: boolean; // For client-side only

	id: string;
	organizationId: string;
	cursor: string | null; // Cursor for pagination
	details: ProductDetailsGQL | null;
	metadata: {
		overview: string;
	};

	createdAt: string; // ISO Date
	updatedAt: string; // ISO Date
}
