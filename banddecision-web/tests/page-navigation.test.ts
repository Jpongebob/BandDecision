// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ path: '/songs/recommendations', push: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => state.path, useRouter: () => ({ push: state.push }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => createElement('a', { href, ...rest }, children) }));
import { PageNavigation } from '../src/components/page-navigation';
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());
describe('navigation from internal screens', () => {
  it.each([['/songs/recommendations','/songs'],['/schedule/recommendations','/schedule'],['/settings/band','/settings'],['/plans','/dashboard']])('returns %s to its parent even on a direct visit', (path, parent) => {
    state.path = path;
    render(createElement(PageNavigation));
    if(parent==='/dashboard'){expect(screen.queryByRole('navigation')).toBeNull();return;}
    expect(screen.getByRole('link',{name:'뒤로'}).getAttribute('href')).toBe(parent);
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
  it('does not duplicate the home link on the dashboard', () => {
    state.path='/dashboard';
    render(createElement(PageNavigation));
    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
