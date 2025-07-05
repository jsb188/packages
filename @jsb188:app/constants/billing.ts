export const PLATFORM_PRODUCT_ENUMS = [
  // Subscriptions
  'perks',
  'kajiwoto_plus',
  'kajiwoto_plus_yearly',
  'kajiwoto_pro',
  'kajiwoto_pro_yearly',

  // These are for future proofing; don't use these until they're in the database
  'big_planet_plus',
  'big_planet_plus_yearly',
  'big_planet_pro',
  'big_planet_pro_yearly',

  // Consumables
  'coins_10',
  'coins_20',
  'coins_100',

  // Expired
  'kajiwoto_creator',
  'creator_dataset_sub',
];

export const SUBSCRIPTION_CATALOG = [
  // [groupName, stripeProductId, stripePriceId]
  ['PLUS', 'prod_H0WgTKq5qiK51Q', 'plan_H0WhZdwYcq9Fn7'],
  ['PRO', 'prod_H0WgTKq5qiK51Q', 'price_1MkLqjJI6Kvu2OvUPzFwwncH'],
];

export const SUBSCRIPTION_CATALOG_TEST = [
  // [groupName, stripeProductId, stripePriceId]
  ['PLUS', 'prod_O2uOYfarTaRqJX', 'price_1QBox9JI6Kvu2OvUoy9vBmKL'],
  ['PRO', 'prod_O2uOYfarTaRqJX', 'price_1QBox9JI6Kvu2OvUQ86KgX5C'],
];

export const PRICE_ID_TO_PRODUCT = {
  plan_H0WhZdwYcq9Fn7: {
    name: 'kajiwoto_plus',
    group: 'PLUS',
  },
  price_1HmqX5JI6Kvu2OvUM1edHUMw: {
    name: 'kajiwoto_plus_yearly',
    group: 'PLUS',
  },
  price_1MkLqjJI6Kvu2OvUPzFwwncH: {
    name: 'kajiwoto_pro',
    group: 'PRO',
  },
  price_1MkLrzJI6Kvu2OvUMPyWvKdt: {
    name: 'kajiwoto_pro_yearly',
    group: 'PRO',
  },
  price_1IOudjJI6Kvu2OvU6znCc2oZ: {
    name: 'coins_10',
    group: 'COINS',
  },
  price_1IOudjJI6Kvu2OvUnRFoUQUm: {
    name: 'coins_20',
    group: 'COINS',
  },
  price_1K3y6EJI6Kvu2OvUYUDJgMy6: {
    name: 'coins_100',
    group: 'COINS',
  },
  // price_HNzF3cC8hMxs0Q: 'kajiwoto_creator',
  // plan_HIXtNYWIEx9eST: 'creator_dataset_sub',
} as {
  [key: string]: {
    name: string;
    group: string;
  };
};

export const PRICE_ID_TO_PRODUCT_TEST = {
  price_1QBox9JI6Kvu2OvUoy9vBmKL: {
    name: 'kajiwoto_plus',
    group: 'PLUS',
  },
  price_1QBox9JI6Kvu2OvU7bKCLUYq: {
    name: 'kajiwoto_plus_yearly',
    group: 'PLUS',
  },
  price_1QBox9JI6Kvu2OvUQ86KgX5C: {
    name: 'kajiwoto_pro',
    group: 'PRO',
  },
  price_1QBox9JI6Kvu2OvU8Fn4ftXb: {
    name: 'kajiwoto_pro_yearly',
    group: 'PRO',
  },
  price_1NGnmKJI6Kvu2OvUx3bykj0F: {
    name: 'coins_10',
    group: 'COINS',
  },
  price_1NGoBHJI6Kvu2OvUONbOujKG: {
    name: 'coins_20',
    group: 'COINS',
  },
  price_1NGoAjJI6Kvu2OvUSRWartW3: {
    name: 'coins_100',
    group: 'COINS',
  },
  // price_HNzJjKRMAhEakr: 'kajiwoto_creator',
  // plan_HIYFVZvX8lLTol: 'creator_dataset_sub',
} as {
  [key: string]: {
    name: string;
    group: string;
  };
};

// Products
// export const PRICES = {
//   kajiwoto_plus: 7.99,
//   kajiwoto_plus_yearly: 87.89,
//   kajiwoto_pro: 29.99,
//   kajiwoto_pro_yearly: 299.99,
//   coins_10: 9.99,
//   coins_20: 19.98,
//   coins_100: 99.90,

//   // Skin Prices
//   SKIN_PRICE_1: 2.99,
//   SKIN_PRICE_2: 4.99,
//   SKIN_PRICE_3: 9.99,
//   SKIN_PRICE_4: 19.99
// };

// export const SUBSCRIPTION_PRODUCTS = [
//   'kajiwoto_plus',
//   'kajiwoto_plus_yearly',
//   'kajiwoto_pro',
//   'kajiwoto_pro_yearly',
//   'kajiwoto_creator',
//   'kplus_test'
// ];

// export const HAS_PLUS_SUB_TYPES = [
//   'plus',
//   'pro'
// ];

// export const HAS_PRO_SUB_TYPES = [
//   'pro'
// ];
