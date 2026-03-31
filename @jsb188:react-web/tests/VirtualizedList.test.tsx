// @vitest-environment jsdom

import { DOM_IDS } from '@jsb188/app/constants/app.ts';
import { loadFragment } from '@jsb188/graphql/cache';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StaticListContainer, VirtualizedList } from '../modules/VirtualizedList';

vi.mock('@jsb188/graphql/cache', () => ({
  loadFragment: vi.fn(),
}));

type TestItem = {
  id: string;
  cursor: string;
  label: string;
  group: string;
};

const mockedLoadFragment = vi.mocked(loadFragment);

let currentRoot: Root | null = null;

/*
 * Create a stable test item for the virtualized list cache.
 */
function createTestItem(id: string, group: string): TestItem {
  return {
    id,
    cursor: `cursor-${id}`,
    label: `Item ${id}`,
    group,
  };
}

/*
 * Seed the mocked GraphQL fragment cache for the current test case.
 */
function setFragmentCache(items: TestItem[], fragmentName = 'TestFragment') {
  const cache = new Map(items.map((item) => [`${fragmentName}:${item.id}`, item]));

  mockedLoadFragment.mockImplementation((cacheKey) => {
    return cache.get(String(cacheKey)) ?? null;
  });
}

/*
 * Flush React effects and queued microtasks after a render.
 */
async function flushRender() {
  await act(async () => {
    await Promise.resolve();
  });
}

/*
 * Render a VirtualizedList into the test DOM with sensible defaults.
 */
async function renderVirtualizedList(
  props: Partial<React.ComponentProps<typeof VirtualizedList>> = {},
) {
  const host = document.getElementById('test-root');
  if (!host) {
    throw new Error('Missing test root element');
  }

  currentRoot = createRoot(host);

  const ItemComponent = ({
    item,
    index,
  }: {
    item: TestItem;
    index: number;
  }) => {
    return <div
      id={`item_${item.id}`}
      data-item-id={item.id}
      data-index={index}
    >
      {item.label}
    </div>;
  };

  const GroupTitleComponent = ({
    groupedList,
  }: {
    groupedList: Array<{ item: TestItem }>;
  }) => {
    return <h2 data-group={groupedList[0]?.item.group}>
      {groupedList[0]?.item.group}
    </h2>;
  };

  await act(async () => {
    currentRoot?.render(
      <VirtualizedList
        GroupTitleComponent={GroupTitleComponent}
        ItemComponent={ItemComponent}
        fragmentName='TestFragment'
        limit={5}
        openModalPopUp={vi.fn()}
        {...props}
      />,
    );
  });

  await flushRender();

  return host;
}

/*
 * Group rendered items by their group key while preserving order.
 */
function groupItemsByGroup(items: Array<{ item: TestItem }>) {
  const groups: Array<Array<{ item: { item: TestItem } }>> = [];

  items.forEach((item) => {
    const lastGroup = groups[groups.length - 1];

    if (!lastGroup || lastGroup[0]?.item.item.group !== item.item.group) {
      groups.push([{ item }]);
      return;
    }

    lastGroup.push({ item });
  });

  return groups;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = `
    <div id="${DOM_IDS.mainBodyScrollArea}"></div>
    <div id="test-root"></div>
  `;

  const scrollArea = document.getElementById(DOM_IDS.mainBodyScrollArea);
  if (!scrollArea) {
    throw new Error('Missing scroll area element');
  }

  Object.defineProperty(scrollArea, 'clientHeight', {
    configurable: true,
    value: 900,
  });
  Object.defineProperty(scrollArea, 'scrollHeight', {
    configurable: true,
    value: 2400,
  });
  Object.defineProperty(scrollArea, 'scrollTop', {
    configurable: true,
    value: 0,
    writable: true,
  });

  scrollArea.getBoundingClientRect = () => ({
    bottom: 900,
    height: 900,
    left: 0,
    right: 1200,
    toJSON: () => '',
    top: 0,
    width: 1200,
    x: 0,
    y: 0,
  });

  scrollArea.scrollTo = vi.fn();
  console.dev = vi.fn();

  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  });
});

afterEach(async () => {
  if (currentRoot) {
    await act(async () => {
      currentRoot?.unmount();
    });
  }

  currentRoot = null;
  mockedLoadFragment.mockReset();
  vi.unstubAllGlobals();
});

describe('StaticListContainer', () => {
  it('applies the default list container classes', () => {
    const html = renderToStaticMarkup(
      <StaticListContainer className='custom_class'>Body</StaticListContainer>,
    );

    expect(html).toContain('class="px_lg pt_df pb_xl fs custom_class"');
    expect(html).toContain('Body');
  });
});

describe('VirtualizedList', () => {
  it('renders grouped items with the header and footer when all items fit in view', async () => {
    const items = [
      createTestItem('3', 'Today'),
      createTestItem('2', 'Today'),
      createTestItem('1', 'Yesterday'),
    ];

    setFragmentCache(items);

    const host = await renderVirtualizedList({
      FooterComponent: ({
        loadedDataSize,
      }: {
        loadedDataSize: number;
      }) => {
        return <div data-testid='footer'>Footer {loadedDataSize}</div>;
      },
      HeaderComponent: <div data-testid='header'>Header</div>,
      GroupTitleComponent: ({
        groupedList,
      }: {
        groupedList: Array<{ item: { item: TestItem } }>;
      }) => {
        return <h2 data-group={groupedList[0]?.item.item.group}>
          {groupedList[0]?.item.item.group}
        </h2>;
      },
      groupItems: groupItemsByGroup,
      startOfListItems: items,
    });

    expect(host.textContent).toContain('Header');
    expect(host.textContent).toContain('Today');
    expect(host.textContent).toContain('Yesterday');
    expect(host.textContent).toContain('Item 3');
    expect(host.textContent).toContain('Item 2');
    expect(host.textContent).toContain('Item 1');
    expect(host.textContent).toContain('Footer 3');
    expect(host.querySelectorAll('[data-item-id]').length).toBe(3);
    expect(host.querySelector('[data-testid="footer"]')).not.toBeNull();
  });

  it('shows the bottom mock when more items remain than the current viewing window', async () => {
    const items = [
      createTestItem('4', 'Today'),
      createTestItem('3', 'Today'),
      createTestItem('2', 'Yesterday'),
      createTestItem('1', 'Yesterday'),
    ];

    setFragmentCache(items);

    const host = await renderVirtualizedList({
      MockComponent: <div data-testid='mock'>Loading more</div>,
      limit: 1,
      reactiveFragmentFn: (id, item) => ({
        ...item,
        id,
        label: `${item.label} reactive`,
      }),
      startOfListItems: items,
    });

    const renderedItems = host.querySelectorAll('[data-item-id]');
    expect(renderedItems.length).toBe(2);
    expect(host.textContent).toContain('Item 4 reactive');
    expect(host.textContent).toContain('Item 3 reactive');
    expect(host.textContent).not.toContain('Item 2 reactive');
    expect(host.querySelector('[data-testid="mock"]')).not.toBeNull();
  });
});
