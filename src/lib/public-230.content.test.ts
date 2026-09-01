import { describe, expect, it } from 'vitest';

import { mapContactSubmitResponse } from './contact-form-adapter';
import {
  getContactRouteTitle,
  getContactUnavailableCopy,
  parseContactFormState,
} from './contact-content';
import {
  formatDownloadMeta,
  getCvRouteTitle,
  getCvUnavailableCopy,
} from './cv-content';
import {
  hasPublishedContactDetails,
  hasPublishedDownloads,
  isContactFormAvailable,
} from './site-settings-content';

describe('PUBLIC-230 site settings helpers', () => {
  it('detects published contact details and form availability', () => {
    const contact = {
      email: 'owner@example.com',
      employer: '',
      employerUrl: '',
      formEnabled: true,
      linkedin: '',
      location: '',
      orcid: '',
    };
    expect(hasPublishedContactDetails(contact)).toBe(true);
    expect(isContactFormAvailable(contact)).toBe(true);
    expect(hasPublishedContactDetails(undefined)).toBe(false);
    expect(isContactFormAvailable({ ...contact, formEnabled: false })).toBe(false);
  });

  it('detects published downloads', () => {
    expect(hasPublishedDownloads([])).toBe(false);
    expect(
      hasPublishedDownloads([
        {
          href: '/media/cv.pdf',
          kind: 'CV',
          mime: 'application/pdf',
          note: '',
          size_bytes: 1024,
          title: 'CV',
          updated_at: null,
        },
      ]),
    ).toBe(true);
  });
});

describe('PUBLIC-230 contact content helpers', () => {
  it('returns localized route titles and unavailable copy', () => {
    expect(getContactRouteTitle('en')).toBe('Contact');
    expect(getContactRouteTitle('fa')).toBe('تماس');
    expect(getContactUnavailableCopy('en').message).toContain('not available yet');
  });

  it('parses contact form return query state', () => {
    const sent = parseContactFormState(new URLSearchParams('sent=1'));
    expect(sent.sent).toBe(true);
    expect(sent.failed).toBe(false);

    const failed = parseContactFormState(
      new URLSearchParams('sent=0&name=Ada&email=ada@example.com&message=Hello'),
    );
    expect(failed.failed).toBe(true);
    expect(failed.values.name).toBe('Ada');
    expect(failed.values.email).toBe('ada@example.com');
    expect(failed.values.message).toBe('Hello');
  });
});

describe('PUBLIC-230 contact form adapter', () => {
  const fields = { name: 'Ada', email: 'ada@example.com', message: 'Hello' };

  it('maps JSON success and failure responses', () => {
    expect(mapContactSubmitResponse(200, 'application/json', '{"ok":true}', fields)).toEqual({
      kind: 'success',
    });
    expect(
      mapContactSubmitResponse(400, 'application/json', '{"ok":false,"error":"bad"}', fields),
    ).toEqual({ kind: 'failure', fields });
  });

  it('never parses 422 HTML as JSON', () => {
    expect(
      mapContactSubmitResponse(422, 'text/html; charset=utf-8', '<!doctype html>', fields),
    ).toEqual({ kind: 'failure', fields });
  });
});

describe('PUBLIC-230 cv content helpers', () => {
  it('returns localized route titles and unavailable copy', () => {
    expect(getCvRouteTitle('en')).toBe('CV');
    expect(getCvRouteTitle('fa')).toBe('رزومه');
    expect(getCvUnavailableCopy('fa').message).toContain('رزومه');
  });

  it('formats download metadata from API fields only', () => {
    expect(
      formatDownloadMeta({
        href: '/media/cv.pdf',
        kind: 'CV',
        mime: 'application/pdf',
        note: '',
        size_bytes: 2048,
        title: 'CV',
        updated_at: '2026-01-01',
      }),
    ).toBe('CV · 2026-01-01 · 2 KB');
  });
});
