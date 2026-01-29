import i18n from '@jsb188/app/i18n';
import { cn } from '@jsb188/app/utils/string';
import { Icon } from '@jsb188/react-web/svgs/Icon';
import { Button } from '@jsb188/react-web/ui/Button';
import Markdown from '@jsb188/react-web/ui/Markdown';
import { memo } from 'react';

/**
 * Types
 */

export interface FBPInstructionsItemObj {
  preset?: 'UPLOAD_BUTTON' | null;
  label?: string;
  text?: string;
}

export interface FBPInstructionsObj {
  leftItems: FBPInstructionsItemObj[],
  rightItems: FBPInstructionsItemObj[]
}

/**
 * Message area; to be placed inside the <FileBrowserPlus> component
 */

export const FileBrowserFooter = memo((p: {
  isEmpty: boolean;
  iconName: string;
  text: string;
}) => {
  const { isEmpty, iconName, text } = p;

  return <div className={cn('rel p_lg v_center cl_lt a_c', isEmpty ? 'bg r_sm' : '')}>
    <div className='pb_df ft_xs ic_xxl'>
      <Icon name={iconName} />
    </div>
    <Markdown as='div'>
      {text}
    </Markdown>
  </div>;
});

FileBrowserFooter.displayName = 'FileBrowserFooter';

/**
 * Instructions content item
 */

const FBPInstructionsContent = memo((p: FBPInstructionsItemObj & {
  isLast?: boolean,
  uploadDisabled: boolean,
  uploadText?: string
}) => {
  const { preset, isLast, uploadDisabled, uploadText } = p;

  switch (preset) {
    case 'UPLOAD_BUTTON':
      return <Button
        preset='outline'
        size='sm'
        className={uploadDisabled ? 'not_allowed cl_md' : undefined}
        disabled={uploadDisabled}
        text={uploadText ?? i18n.t('form.upload_files')}
      />;
    default:
  }

  return <div className={isLast ? undefined : 'mb_20'}>
    <p className='ft_medium'>{p.label}</p>
    <Markdown as='p' preset='article'>
      {p.text}
    </Markdown>
  </div>;
});

FBPInstructionsContent.displayName = 'FBPInstructionsContent';

/**
 * Instructions item for empty folders
 */

export function FileBrowserInstructions(p: FBPInstructionsObj & {
  uploadDisabled: boolean,
  uploadText?: string
}) {
  const { leftItems, rightItems, uploadDisabled, uploadText } = p;
  const lLastIx = leftItems.length - 1;
  const rLastIx = rightItems.length - 1;

  return <div className='bd_t_1 bd_lt ft_xs grid size_2 gap_n p_15'>
    <div className='p_10'>
      {leftItems.map((item, index) => {
        return <FBPInstructionsContent key={index} {...item} isLast={index === lLastIx} uploadDisabled={uploadDisabled} uploadText={uploadText} />;
      })}
    </div>

    <div className='p_10'>
      {rightItems.map((item, index) => {
        return <FBPInstructionsContent key={index} {...item} isLast={index === rLastIx} uploadDisabled={uploadDisabled} uploadText={uploadText} />;
      })}
    </div>
  </div>
}
