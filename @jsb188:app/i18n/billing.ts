import { SOCIAL_URLS } from "../constants/app";

// NOTE: Can't use /constants/ here because this file is loaded before all else
const PerksSubDays = 14;

export default {
  en: {
    // General
    free_perks_desc: 'Free every time you post on social media',
    subscribe: 'Subscribe',
    per_month: '%{price} per month',
    per_year: '%{price} per year',
    save_per_cent: 'Save %{perCent}%',
    purchase_details: 'Purchase details',
    credit_card: 'Credit card',
    name_on_card: 'Name on card',
    upgrade: 'Upgrade',

    // Subscription
    subscription: 'Subscription',
    subscription_desc: (
      'Big Planet is an independent platform without any outside funding. All of the money earned ' +
      'from subscriptions are used to pay for servers and to develop new features.'
    ),
    sub_none: 'You do not have an active subscription right now.',
    sub_perks: 'Your Perks subscription will expire on %{date}.',
    sub_active_1: 'Your',
    sub_active_2: 'subscription will auto renew on %{date}.',
    sub_will_expire: 'subscription will expire on %{date}.',
    sub_group_PERKS: 'Free Perks',
    sub_group_PLUS: 'Plus',
    sub_group_PRO: 'Pro',
    sub_cancelled_billing_msg: 'Your account will remain upgraded until the expiration date.',
    cancelled_sub_msg: 'You will not be billed again after the expiration date.',
    sub_active_billing_msg: 'You may cancel your subscription at any time.',

    // Checkout form
    PLUS_subscription: 'Plus subscription',
    PRO_subscription: 'Pro subscription',
    choose_payment_opt: 'Choose a payment option',

    PERKS_desc_1: 'Say something nice on YouTube, TikTok, Instagram, X, personal blog, or anywhere you want.',
    PERKS_desc_2: `Follow us on X and share your message mentioning us (@${SOCIAL_URLS.MARKETDAY.x_username}) with your Big Planet ID or username.`,
    PERKS_desc_3: `Wait until you receive a reply on X, Perks subscription (${PerksSubDays} days) will be added to your account.`,

    PLUS_year: 'Plus (yearly)',
    payment_details_PLUS_year: (
      'You are purchasing a recurring PLUS subscription. You will be charged %{price} / year starting today. ' +
      'You may cancel your subscription at any time from the settings screen.'
    ),
    PLUS_month: 'Plus (monthly)',
    payment_details_PLUS_month: (
      'You are purchasing a recurring PLUS subscription. You will be charged %{price} / month starting today. ' +
      'You may cancel your subscription at any time from the settings screen.'
    ),

    PRO_year: 'Pro (yearly)',
    payment_details_PRO_year: (
      'You are purchasing a recurring PRO subscription. You will be charged %{price} / year starting today. ' +
      'You may cancel your subscription at any time from the settings screen.'
    ),
    PRO_month: 'Pro (monthly)',
    payment_details_PRO_month: (
      'You are purchasing a recurring PRO subscription. You will be charged %{price} / month starting today. ' +
      'You may cancel your subscription at any time from the settings screen.'
    ),

    pay_get_PLUS_month: 'Pay for Plus (monthly)',
    pay_get_PLUS_year: 'Pay for Plus (yearly)',
    pay_get_PRO_month: 'Pay for Pro (monthly)',
    pay_get_PRO_year: 'Pay for Pro (yearly)',

    payment_delayed: 'Payment delayed',
    payment_delayed_msg: (
      'Your payment attempt failed and is being retried. When the payment completes, your account will be updated.'
    ),

    checkout_completed_msg: (
      'Your account was updated. If there are problems, ' +
      'please contact us by e-mail.'
    ),

    try_again_diff_card: 'Try with a different card',
    to_cancel_sub: ' to cancel your subscription.',

    cancel_confirm_msg: (
      'Do you want to cancel your subscription and stop all future payments?' +
      '\n\n' +
      'Your upgraded membership will remain active until the expiration date.'
    ),
    cancel_my_sub: 'Cancel my subscription',
    keep_my_sub: 'Keep my subscription',
  },
};
