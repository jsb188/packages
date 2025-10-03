import { PRODUCT_LIVESTOCK_STATUS, PRODUCT_LIVESTOCK_TYPES } from '../../../@jsb188:app/constants/product';

/**
 * Enums
 */

export type ProductLivestockTypeEnum = typeof PRODUCT_LIVESTOCK_TYPES[number];
export type ProductLivestockStatusEnum = typeof PRODUCT_LIVESTOCK_STATUS[number];

/**
 * Product details data object
 */

interface ProductDetailsBase {
  id?: number;
  productId: number;
  metadata: {
    overview: string;
  }
}

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

export type ProductDetailsObj = ProductLivestockObj;

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
	id: number;
	[key: string]: any;
}
