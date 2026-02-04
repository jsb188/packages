import { cn } from '@jsb188/app/utils/string.ts';
import { memo, useEffect, useState } from 'react';

/**
 * Activity Dots
 */

interface ActivityDotsProps {
  className?: string;
  size?: 'tn' | 'sm' | 'df' | 'md' | 'lg';
}

export function ActivityDots(p: ActivityDotsProps) {
  const size = p.size || 'df';

  return (
    <span className={cn('activity h_center', size, p.className)}>
      <span className={cn('r dot d0', size)} />
      <span className={cn('r dot d1', size)} />
      <span className={cn('r dot d2', size)} />
    </span>
  );
}

/**
 * Big loading
 */

export function BigLoading(p: BigLoadingProps) {
  const { color } = p;
  return <div className={cn('big_loader', color || 'default')} />;
}

/**
 * Big loading; but with delay
 */

interface BigLoadingProps {
  color?: 'default' | 'alt' | 'active';
}

interface BigLoadingDelayedProps extends BigLoadingProps {
  delay: number;
}

export const BigLoadingDelayed = memo((p: BigLoadingDelayedProps) => {
  const { delay, ...other } = p;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return <BigLoading {...other} />;
});

BigLoadingDelayed.displayName = 'BigLoadingDelayed';

/**
 * Circular progress
 */

interface ProgressCircleProps {
  saving?: boolean;
  percent: number | null;
}

export const ProgressCircle = memo((p: ProgressCircleProps) => {
  const { saving, percent } = p;
  const pcValue = (percent || 0.01) * 100;

  if (percent === null || (!saving && pcValue < 100)) {
    return null;
  }

  const strokeWidth = 3;
  const totalArea = 100 - strokeWidth * 2;
  const radius = totalArea / 2;
  const cPos = radius + strokeWidth;
  const circumference = radius * Math.PI * 2;
  const dash = (pcValue * circumference) / 100;
  const strokeDashArray = `${dash} ${circumference - dash}`;

  return (
    <div className='circular_progress r'>
      <svg viewBox='0 0 100 100'>
        <circle
          className='circle_outline'
          cx={cPos}
          cy={cPos}
          r={radius}
          fill='none'
          strokeWidth={strokeWidth}
        />
        <circle
          className='circle_line'
          cx={cPos}
          cy={cPos}
          r={radius}
          fill='none'
          // stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDashArray}
          strokeLinecap='round'
        />
      </svg>

      <div className='pill pill_sm r v_center bg_medium z2 cl_main'>
        {Math.round(pcValue)}%
      </div>
    </div>
  );
});

ProgressCircle.displayName = 'ProgressCircle';

/**
 * Mock avatar
 */

interface MockAvatarProps {
  className?: string;
  roundedClassName?: string;
  preset?: 'active' | null;
  size?: 'xxxs' | 'xxs' | 'xs' | 'sm' | 'df' | 'md' | 'lg' | 'xl';
}

export const MockAvatar = memo((p: MockAvatarProps) => {
  const { size, className, preset, roundedClassName } = p;
  return <span
    className={cn('mock_av', preset, `av_${size || 'df'}`, roundedClassName ?? 'r', className)}
  />
});

MockAvatar.displayName = 'MockAvatar';

/**
 * Mock texts
 */

interface MockTextProps {
  children: string;
  preset?: 'active' | null;
  includeSpace?: boolean;
  fontSizeClassName?: string;
  className?: string;
}

export const MockText = memo((p: MockTextProps) => {
  const { children, includeSpace, className, ...rest } = p;
  const { preset, fontSizeClassName } = rest;

  if (includeSpace) {
    const words = children.split(' ');
    const lastIx = words.length - 1;
    return words.map((word, i) => {
      return (
        <MockText
          key={i}
          {...rest}
          className={cn(className, i === lastIx ? '' : 'mr_xs')}
        >
          {word}
        </MockText>
      );
    });
  }

  return <span className={cn('active mock', fontSizeClassName ?? 'ft_xs', className, preset)}>
    {children}
  </span>;
});

MockText.displayName = 'MockText';
