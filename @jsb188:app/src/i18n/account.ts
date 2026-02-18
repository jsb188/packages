export default {
  en: {
    name_ph: 'e.g. "Jane Doe"',
    pronouns: 'Pronouns',
    pronouns_ph: 'Enter your pronouns',
    about: 'About me',
    about_ph: 'This text will be displayed on your profile for others to see.',
    username: 'Username',
    username_ph: 'e.g. "@jane_doe"',
    username_info: 'Username, ID, and e-mail is used to log in to your account.',
    email: 'E-mail',
    email_ph: 'e.g. jane_doe@email.com',
    phone_ph: 'e.g. 123-444-5555',
    password: 'Password',
    password_ph: 'Enter your password',
    passwordRepeat: 'Password (repeat)',
    search_ph: 'Search @ or ID',
    no_one_found_: 'No one found: "%{query}"',
    profile_no_desc: 'This user hasn\'t written anything about themselves.',
    no_one_found: 'No one found with this query.',

    // App settings
    manage_team: 'Manage team',
    change_role: 'Change role',
    change_role_desc: (
      'Choose [hl]%{name}[/hl]\'s new role in _%{orgName}_. ' +
      'This will change their permissions and access to certain features.'
    ),
    edit_note_desc: 'Edit note for [hl]%{name}[/hl].',
    edit_note_fin_msg: 'Note for [hl]%{name}[/hl] in _%{orgName}_ has been updated.',
    edit_note_help: (
      'It\'s useful to write information here such as their job function, ' +
      'dietary preferences, disabilities or anything else to help guide the AI. ' +
      '_AI may update this note when it receives new information._'
    ),
    change_role_fin_msg: (
      '[hl]%{name}[/hl]\'s role in _%{orgName}_ has been changed to **%{role}**.'
    ),
    remove_member_confirm_msg: 'Are you sure you want to remove\n [hl]%{name}[/hl] from _%{orgName}_?',
    remove_member_fin_msg: '[hl]%{name}[/hl] has been removed from _%{orgName}_.',
    remove_member: 'Remove member',
    account: 'Account',
    fName: 'First name',
    lName: 'Last name',
    language: 'Language',
    ai_language: 'Preferred language for AI',
    timeZone: 'Time zone',
    your_account: 'Your account',
    your_preferences: 'Your preferences',
    profile: 'Profile',
    profile_desc: 'Change how your profile looks to others.',
    personas: 'Personas',
    show_password: 'Show password',
    hide_password: 'Hide password',
    change_password: 'Change password',
    change_password_desc: 'Change your account\'s login password.',
    // personas_desc: 'Manage your roleplay personas. Persona for the chat (your name and photo) can be changed by clicking your photo next to the chat textarea.',
    personas_desc: 'Use personas to easily change your display name and profile photo. You can change your persona by clicking your photo next to the chat textarea.',
    persona_label: 'Roleplay persona',
    persona_ph: 'Persona\'s name',
    upload_photo_desc: 'Change your profile photo.',
    upload_persona_photo_desc: 'Change your persona\'s photo.',
    badge: 'Badge',
    badge_desc: 'Change the badge that appear next to your name in chat.',
    badge_instr: 'This badge will be displayed next to your name:',

    // Change sensitive account settings/info
    enter_password: 'Enter password',
		enter_password_msg: 'Confirm your identity before continuing.',
    new_email: 'New e-mail address',
    email_updated: 'E-mail updated',
    email_updated_msg: 'Your e-mail address has been updated to:\n %{emailAddress}.',
    change_email: 'Change e-mail',
    change_email_msg: 'You will receive a confirmation e-mail\n to your new address.',
    change_email_pw_confirm_msg: 'Confirm your identity to change\n your e-mail address.',
    change_email_verify_msg: 'Follow the instructions in the e-mail we sent\n to change your e-mail address.',
    change_phone: 'Change phone number',
    change_phone_msg: 'Confirm your identity to change\n your phone number.',
    currentPassword: 'Current password',
    newPassword: 'New password',
    newPasswordRepeat: 'New password (repeat)',

    // Log out
    logout: 'Log out',
    logout_message: 'Do you want to log out from this account?',
    logout_yes: 'Yes, log me out',

    // Online status
    status_ONLINE: 'Online',
    status_AWAY: 'Away',
    status_BUSY: 'Busy',
    status_APPEAR_OFFLINE: 'Appear offline',

    // Mini status profile
    copy_id: 'Copy ID',

    // Profile
    avatar_color: 'Avatar color',
    open_profile: 'Open profile',
    cards_ct: '%{smart_count} Card||||%{smart_count} Cards',
    report_user: 'Report user',
    profile_deactivated_desc: 'This account has been deactivated.',
    phone_numbers: 'Phone numbers',

    // Roles
    role: {
      MEMBER: 'Employee',
      MANAGER: 'Manager',
      ADMIN: 'Admin',
      OWNER: 'Owner',
    },
  },
};
