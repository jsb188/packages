export default {
  en: {
    // Login
    welcome_back: 'Welcome back',
    log_in: 'Log in',
    log_in_sign_up: 'Log in / Sign up',
    open_app: 'Open app',
    continue_with_google: 'Continue with Google',
    continue_with_discord: 'Continue with Discord',
    continue_with_apple: 'Continue with Apple',
    continue_with_phone: 'Continue with Phone',
    login_opts_main: 'Phone number or e-mail',
    verify_your_acc: 'Verify your account',
    reset_password: 'Reset password',
    forgot_password_: 'Forgot password or username?',
    signup_email: 'Sign up using e-mail',
    log_in_w_existing: 'Log in with an existing account',
    log_in_other_methods: 'Log in using other methods',
    change_password: 'Change password',
    you_are_verified_: 'You are verified!',
    account_is_verified: 'Thank you for verifying your account with e-mail address: **%{emailAddress}**. Please log in again using your password.',
    continue_to_login: 'Continue to log in',
    continue_to_app: 'Continue to app',

    // Phone 2FA
    send_verification_code_msg: 'Enter your phone number and we will send you a verification code for authentication.',
    send_verification_code: 'Send verification code',
    confirm_verification_code_instr: 'Enter the verification code sent to your phone. Please wait few minutes if you did not receive it.',
    resend_verification_code: 'Re-send verification code',
    verification_code_wrong: 'Verification code you entered is incorrect. Please try again.',

    // Auth
    username_not_found: 'No one was found with that username.',
    signed_in: 'Signed in',
    hello_: 'Hello %{name}!',
    you_are_logged_in: 'You are signed in.',
    password_changed_msg: 'Your password has been changed.',
    request_reset_password_instr: 'Enter your e-mail address and we will send you instructions to reset your password.',
    resend_verification_instr: 'Enter your e-mail address and we will send you an e-mail to verify your account.',
    reset_password_instr: 'Choose a new password for your account with the e-mail address: %{emailAddress}',
    _verify_your_email: ' to verify your e-mail.',
    _verify_your_phone: ' to verify your phone number.',
    account_secured_: 'Account secured!',
    one_last_step_: 'One last step!',
    add_password: 'Add password',
    add_password_log_in_msg: 'Please add a password to your account (%{identifier}) for security. You will be logged in afterwards.',
    add_password_fin_msg: 'Your account has been secured with a password. From now on, you may use your password to log in.',

    // Auth - check fails
    no_account_with_phone: 'No account was found with that phone number.',
    no_account_with_email: 'No account was found with that e-mail address.',
    not_valid_email_or_phone: 'That is not a valid phone number or e-mail address.',

    // Reset password (requested)
    reset_password_requested_msg: (
      'Check your e-mail, <strong>%{emailAddress}</strong> ' +
      'for instructions to reset your password.'
    ),
    if_need_more_help_email: (
      'If you need assistance, please contact us at ' +
      '[%{emailAddress}](mailto:%{emailAddress}).'
    ),

    // Invite required
    invite_required: 'Invite required',
    invite_required_msg: (
      'Account creation is currently not opened to the public. ' +
      'Ask your team for an invite or contact us at ' +
      '[%{emailAddress}](mailto:%{emailAddress}) to create an account.'
    ),

    // Sign up
    sign_up: 'Sign up',
    create_account: 'Create an account',
    agree_and_continue: 'Agree and continue',
    sign_up_notice_msg: (
      'By selecting "Agree and continue", I agree to the ' +
      '[Terms of Service](/tos) and acknowledge the ' +
      '[Privacy Policy](/privacy).'
    ),
    email_sent: 'E-mail sent',
    check_email_msg: 'Please check your e-mail for instructions to verify your account.',
    // check_email_3: 'Click "continue" to log in as ',
    // check_email_4: ' or re-send another verification link to your e-mail.',
    check_email: 'Check your e-mail',
    not_verified_yet: 'Please verify your e-mail and try again.',
    resend_change_verification: 'Re-send verification link or change e-mail',
    verify_account: 'Verify your account',
    verify_email_msg: 'Send a new verification link to your e-mail.',
    resend_verification: 'Send verification e-mail',

    // Sign up success
    account_created: 'Account created',
    account_created_msg: (
      'Your account has been created successfully. Please follow the instructions ' +
      'in the e-mail we sent you to verify your account.'
    ),

    // Sign out
    sign_out: 'Sign out',
    signing_out_: 'Signing you out...'
  },
};
