import { describe, expect, it } from 'vitest';

import {
  getResearchRouteTitle,
  getResearchUnavailableCopy,
  splitBodyParagraphs,
} from './research-content';
import {
  getPublicationsUnavailableCopy,
  publicationsRouteTitle,
} from './publications-content';

describe('research content helpers', () => {
  it('provides locale-specific route and unavailable copy', () => {
    expect(getResearchRouteTitle('en')).toBe('Research');
    expect(getResearchRouteTitle('fa')).toBe('پژوهش');
    expect(getResearchUnavailableCopy('en').message).toMatch(/not available/i);
    expect(getResearchUnavailableCopy('fa').message).toMatch(/در دسترس نیست/);
  });

  it('splits body text into paragraphs', () => {
    expect(splitBodyParagraphs('One.\n\nTwo.')).toEqual(['One.', 'Two.']);
  });
});

describe('publications content helpers', () => {
  it('exposes seed-aligned route titles and unavailable copy', () => {
    expect(publicationsRouteTitle.en).toBe('Research Outputs');
    expect(publicationsRouteTitle.fa).toBe('خروجی‌های پژوهشی');
    expect(getPublicationsUnavailableCopy('en').message).toMatch(/not available/i);
  });
});
