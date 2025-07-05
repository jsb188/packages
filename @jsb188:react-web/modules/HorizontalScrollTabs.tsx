import { memo } from 'react';
import { HorizontalScrollContainer, Tab } from '../ui/Tab';
import type { TabProps } from '../ui/Tab';

/**
 * Horizontal scrollable tabs
 */

interface HorizontalScrollTabsProps {
  className?: string;
  selectedValue?: string | number | null;
  onClickItem?: (value?: string | number | null) => void;
  options: Omit<TabProps, 'onClick' | 'selected'>[];
}

const HorizontalScrollTabs = memo((p: HorizontalScrollTabsProps) => {
  const { className, selectedValue, onClickItem, options } = p;

  return <HorizontalScrollContainer addMarginOffset className={className}>
    {options?.map((option, index) => (
      <Tab
        key={option.value || `hst_${index}`}
        selected={selectedValue === option.value}
        onClick={onClickItem}
        {...option}
      />
    ))}
  </HorizontalScrollContainer>;
});

HorizontalScrollTabs.displayName = 'HorizontalScrollTabs';

export default HorizontalScrollTabs;
