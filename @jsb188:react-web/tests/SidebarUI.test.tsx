import { describe, expect, it } from 'vitest';

import { isSidebarItemSelected } from '../ui/SidebarUI';

describe('isSidebarItemSelected', () => {
  it('does not select /app for nested app routes', () => {
    expect(isSidebarItemSelected('/app/c/chat_123', '/app')).toBe(false);
  });

  it('selects exact routes and child path segments', () => {
    expect(isSidebarItemSelected('/app', '/app')).toBe(true);
    expect(isSidebarItemSelected('/app/r/report_123/2026', '/app/r/report_123')).toBe(true);
  });

  it('selects trailing-slash route prefixes', () => {
    expect(isSidebarItemSelected('/app/c/chat_123', '/app/c/')).toBe(true);
  });
});
