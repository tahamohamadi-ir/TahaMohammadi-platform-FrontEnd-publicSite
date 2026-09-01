import { describe, expect, it } from 'vitest';

import {
  formatCreativeCardMeta,
  getCreativeRouteTitle,
  getCreativeUnavailableCopy,
} from './creative-content';

describe('creative content helpers', () => {
  it('returns localized route titles and unavailable copy', () => {
    expect(getCreativeRouteTitle('en')).toBe('Creative');
    expect(getCreativeRouteTitle('fa')).toBe('آثار خلاقه');
    expect(getCreativeUnavailableCopy('en').message).toContain('not available yet');
    expect(getCreativeUnavailableCopy('fa').title).toBe('آثار خلاقه');
  });

  it('formats creative card metadata from API fields only', () => {
    expect(
      formatCreativeCardMeta({
        locale: 'en',
        slug: 'ivory-forms',
        title: 'Ivory Forms',
        description: '',
        work_type: 'Photography',
        creator_name: 'Taha Mohammadi',
        creator_role: 'Artist',
        creation_date: '2025',
        access_state: 'Public',
        license: 'CC BY',
        published_at: '2026-01-01T00:00:00Z',
        updated_at: null,
      }),
    ).toBe('Photography · Taha Mohammadi · 2025 · Public');
  });
});
