import { cn } from '@jsb188/app/utils/string.ts';

/**
 * Auth form container
 */

interface AuthFormContainerProps {
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function AuthFormContainer(p: AuthFormContainerProps) {
  const { title, className, children } = p;

  return (
    <div className='cw xs'>
      <div className='a_c -mb_5 anim_lift_scale_center on_mount spd_4'>
        <h1 className='ft_md ft_bold ls_1 lh_1 p_n cl_secondary op_50 visible'>
          {title}
        </h1>
      </div>
      <div className={cn('bg px_md py_lg r_dfw rel z2', className)}>
        {children}
      </div>
    </div>
  );
}
