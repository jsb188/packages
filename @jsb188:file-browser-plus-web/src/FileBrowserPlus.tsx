
/**
 * App settings layout
 */

export function FileBrowserPlus(p: {
  switchCase: string;
  onClickNavItem?: (value: string) => boolean | void; // If "false" is returned, it denies the switchCase change
}) {

  return <div className="p_sm rel of pattern_texture texture_bf -mx_xs mt_4">
    <div className='h_spread gap_10 rel'>
      <span>0/2 Documents</span>

      <div class="h_right gap_sm">
        <span class="rel">Page 1 of 0</span>
      </div>
    </div>
  </div>
}
