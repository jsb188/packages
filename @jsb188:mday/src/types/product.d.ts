import { PRODUCT_LIVESTOCK_STATUS, PRODUCT_LIVESTOCK_TYPES } from '../../../@jsb188:app/constants/product';

/**
 * Enums
 */

export type ProductLivestockTypeEnum = typeof PRODUCT_LIVESTOCK_TYPES[number];
export type ProductLivestockStatusEnum = typeof PRODUCT_LIVESTOCK_STATUS[number];

/**
 * GraphQL Data
 */

export interface ProductGQL {
  id: number;
  [key: string]: any;
}
