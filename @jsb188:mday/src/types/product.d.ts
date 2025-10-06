import { PRODUCT_EVENT_FREQUENCY, PRODUCT_TYPES, PRODUCT_LIVESTOCK_STATUS, PRODUCT_LIVESTOCK_TYPES } from '@jsb188/app/constants/product';
import type { AddressObj, ScheduleObj } from '@jsb188/app/types/other.d';

/**
 * Enums
 */

export type ProductTypeEnum = typeof PRODUCT_TYPES[number];
export type ProductLivestockTypeEnum = typeof PRODUCT_LIVESTOCK_TYPES[number];
export type ProductLivestockStatusEnum = typeof PRODUCT_LIVESTOCK_STATUS[number];
export type ProductEventFrequencyEnum = typeof PRODUCT_EVENT_FREQUENCY[number];

/**
 * Product details base
 */

interface ProductDetailsBase {
  id?: number;
  productId: number;
  metadata: {
    overview: string;
  }
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
  livestockGroup?: string;
}

/**
 * Product details; Calendar event
 */

export interface ProductCalendarEventObj extends ProductDetailsBase {
  __table: 'products_calendar_events';
	organizationId: number;

  title: string;
  frequency: ProductEventFrequencyEnum;
  schedule: ScheduleObj | null;
  address: AddressObj | null;
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
	id: string;
  organizationId: string;
  cursor: string | null; // Cursor for pagination
  details: ProductDetailsObj | null;
  metadata: {
    overview: string;
  }

  createdAt: string; // ISO Date
  updatedAt: string; // ISO Date
}
