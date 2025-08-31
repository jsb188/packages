export const accountAuthFragment = `fragment accountAuthFragment on AccountAuth {
  token
  primaryOrganizationId
  activated
  hasPassword

  alertUpdatesOnMount
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
