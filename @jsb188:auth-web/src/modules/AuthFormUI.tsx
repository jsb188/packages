import { cn } from '@jsb188/app/utils/string.ts';
import { useEffect, useRef, useState } from 'react';

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

/**
 * Verification code input
 */

interface VerificationCodeInputProps {
  saving?: boolean;
  codeLength?: number;
  onSubmit: (code: string) => void;
}

export function VerificationCodeInput(p: VerificationCodeInputProps) {

  const { saving, onSubmit } = p;
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const codeLength = p.codeLength || 5;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) || e.metaKey) {
      // Do nothing for these keys
      e.preventDefault();
      return;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (code.length === codeLength) {
        onSubmit(code);
      }
    }
  };

  const onChange = (value: string) => {
    if (!saving) {
      setCode(value);

      if (value.length >= codeLength) {
        onSubmit(value);
      }
    }
  };

  useEffect(() => {
    if (!focused && !saving) {
      const keyDownListener = (e: KeyboardEvent) => {
        if (
          (e.key === 'Backspace' || !isNaN(Number(e.key))) &&
          !e.metaKey &&
          !e.altKey &&
          !e.ctrlKey
        ) {
          inputRef.current?.focus();
        }
      };

      addEventListener('keydown', keyDownListener, false);
      return () => {
        removeEventListener('keydown', keyDownListener, false);
      };
    }
  }, [focused, saving]);

  return <div className={cn('p_5 r_df trans_color spd_1', focused ? 'bg_main' : 'bg_alt')}>
    <div className={cn('bg px_df py_df r_sm rel h_spread ft_xxl a_c', saving ? 'cl_lt' : 'cl_df')}>
      {[...Array(codeLength)].map((_, i) => {
        const letter = code.charAt(i);
        return <span
          key={i}
          className={cn('f', letter ? undefined : 'cl_lt')}
        >
          {letter || '#'}
        </span>;
      })}
      <input
        ref={inputRef}
        id='verification_code'
        type='number'
        className='abs_full invis_input z2'
        disabled={saving}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        onChange={(e) => onChange(e.target.value)}
        value={code}
        maxLength={codeLength}
      />
    </div>
  </div>;
}
