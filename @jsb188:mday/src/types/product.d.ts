import type { AccountData } from '@jsb188/app/types/account.d.ts';
import type { AddressObj, ScheduleObj } from '@jsb188/app/types/other.d.ts';
import { PRODUCT_TYPES } from '../constants/product.ts';
import type { OrganizationData, OrganizationGQL } from './organization.d.ts';

/**
 * Enums
 */

export type ProductTypeEnum = typeof PRODUCT_TYPES[number];

/**
 * Filters
 */

export interface ProductsFilterArgs {
	preset?: '?' | null;
	productType: ProductTypeEnum;
	query?: string | null;
	calDate?: string | null; // "YYYY-MM-DD"
	timeZone?: string | null; // Server only for now
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

export type ProductDetailsObj = ProductCalEventObj;
export type ProductDetailsData = ProductCalEventData;
export type ProductDetailsGQL = ProductCalEventGQL;

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
