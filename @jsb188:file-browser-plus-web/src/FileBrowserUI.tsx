import { Icon } from '@jsb188/react-web/svgs/Icon';
import Markdown from '@jsb188/react-web/ui/Markdown';
import { memo } from 'react';

/**
 * Message area; to be placed inside the <FileBrowserPlus> component
 */

export const FileBrowserMessageArea = memo((p: {
  iconName: string;
  text: string;
}) => {
  const { iconName, text } = p;

  return <div className='rel p_lg v_center cl_lt a_c bd_t_3 bd_active'>
    <div className='py_df ft_xs ic_xxl'>
      <Icon name={iconName} />
    </div>
    <Markdown as='p' className='pb_sm'>
      {text}
    </Markdown>
  </div>;
});

FileBrowserMessageArea.displayName = 'FileBrowserMessageArea';