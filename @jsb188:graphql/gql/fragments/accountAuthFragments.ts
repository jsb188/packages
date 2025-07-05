export const accountAuthFragment = `fragment accountAuthFragment on AccountAuth {
  token
  primaryOrganizationId
  activated
  hasPassword
  webVersion
  mobileVersion

  settings {
    theme
    lightMode
    timeZone
    showSelfAvatar
    isBubbleOther
    showOtherAvatar
  }
}`;
