import { describe, expect, it } from 'vitest';

import {
  buildAlternateLinks,
  buildCanonicalUrl,
  localeFromPath,
  stripLocalePrefix,
} from './routes';

describe('locale route helpers', () => {
  it('reads locale prefixes', () => {
    expect(localeFromPath('/fa/about/')).toBe('fa');
    expect(localeFromPath('/en/')).toBe('en');
    expect(localeFromPath('/')).toBeNull();
  });

  it('strips locale prefixes', () => {
    expect(stripLocalePrefix('/fa/about/')).toBe('about');
    expect(stripLocalePrefix('/en/')).toBe('');
  });

  it('builds canonical URLs', () => {
    expect(buildCanonicalUrl('https://tahamohamadi.ir', 'fa', 'about')).toBe(
      'https://tahamohamadi.ir/fa/about/',
    );
  });

  it('builds hreflang alternates when available', () => {
    expect(
      buildAlternateLinks('https://tahamohamadi.ir', 'en', 'about', true),
    ).toEqual([
      { hreflang: 'en', href: 'https://tahamohamadi.ir/en/about/' },
      { hreflang: 'fa', href: 'https://tahamohamadi.ir/fa/about/' },
      { hreflang: 'x-default', href: 'https://tahamohamadi.ir/fa/about/' },
    ]);
  });
});
