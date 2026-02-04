import { SUBSCRIPTION_CATALOG, SUBSCRIPTION_CATALOG_TEST } from '../constants/billing.ts';

/**
 * Types
 */

type SubscriptionCatalogItem = {
  group: string;
  notReady: boolean;
  priceLabel: string | null;
  startingPrice: number;
  currency: string;
  recurringInterval: string;
  recurringIntervalCount: number;
};

type SubscriptionPricingOption = {
  id: string;
  group: string;
  notReady: boolean;
  priceLabel: string;
  price: number;
  currency: string;
  recurringInterval: string;
  recurringIntervalCount: number;
};

/**
 * Get development or production catalog
 */

function getSubscriptionCatalog(isDev = false) {
  return isDev ? SUBSCRIPTION_CATALOG_TEST : SUBSCRIPTION_CATALOG;
}

/**
 * Get list of subscription catalogs
 */

export function getPlatformSubscriptionCatalog(platformProducts?: any[], isDev?: boolean): SubscriptionCatalogItem[] {

  return getSubscriptionCatalog(isDev).map((sub) => {
    const [groupName, stripeProductId, stripePriceId] = sub;
    const product = platformProducts?.find((pr: any) => pr.id === stripeProductId);
    const startingPrice = product?.prices?.find((pc: any) => pc.id === stripePriceId);

    if (!startingPrice) {
      // Data is not ready; or the Stripe API Key used by the server is _not_ the live key
      return {
        group: groupName,
        notReady: true,
        priceLabel: null,
        startingPrice: 0,
        currency: 'USD',
        recurringInterval: 'month',
        recurringIntervalCount: 1
      };
    }

    // Add locale here later
    const locale = undefined;

    const priceLabel = (
      startingPrice.unitAmount / 100
    ).toLocaleString(locale, {
      style: 'currency',
      currency: startingPrice.currency,
    });

    return {
      group: groupName,
      notReady: false,
      priceLabel,
      startingPrice: startingPrice.unitAmount,
      currency: startingPrice.currency,
      recurringInterval: startingPrice.recurringInterval,
      recurringIntervalCount: startingPrice.recurringIntervalCount,
    };
  });
}


/**
 * Get list of subscription options for each tier
 */

export function getPlatformSubscriptionPricingOptions(
  platformProducts?: any[],
  subGroup?: 'PERKS' | 'PLUS' | 'PRO' | 'COINS',
  isDev?: boolean
): SubscriptionPricingOption[] {

  const catalogItem = getSubscriptionCatalog(isDev).find((item: any) => item[0] === subGroup);
  if (!catalogItem) {
    console.warn('Unknown subscription group: ' + subGroup);
    return [];
  }

  const [, stripeProductId] = catalogItem;
  const product = platformProducts?.find((pr: any) => pr.id === stripeProductId);
  if (!product) {
    if (platformProducts) {
      console.warn('Platform product not found for: ' + stripeProductId);
    }
    return [];
  }

  const pricingList = product.prices
    .filter((pc: any) => pc.productGroup === subGroup)
    .sort((pc: any) => pc.recurringInterval === 'year' ? -1 : 1);

  return pricingList.map((pc: any) => {
    // Add locale here later
    const locale = undefined;

    const priceLabel = (
      pc.unitAmount / 100
    ).toLocaleString(locale, {
      style: 'currency',
      currency: pc.currency,
    });

    return {
      id: pc.id,
      group: pc.productGroup,
      notReady: false,
      priceLabel,
      price: pc.unitAmount,
      currency: pc.currency,
      recurringInterval: pc.recurringInterval,
      recurringIntervalCount: pc.recurringIntervalCount,
    };
  });
}
