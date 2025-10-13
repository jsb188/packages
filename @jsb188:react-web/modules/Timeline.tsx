import { memo } from 'react';
import '../ui/TimelineUI';

/**
 * Horizontal Timeline
 *
 * this is depreacted
 */

export const HorizontalTimeline = memo(() => {
  return <div className='bg_active w_f h_spread horizontal_timeline'>
    <div className='tl_dot r bg_primary' />
    <div className='tl_dot r bg_active' style={{ left: '100%' }} />
  </div>;
})