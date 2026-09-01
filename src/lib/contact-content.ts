/**
 * Contact page family — `GET /api/site` contact block + `POST /api/contact` form (PUBLIC-230).
 * Renders unavailable when no owner-published contact details or form exist.
 */

import type { PublicContactBlockOut } from './site-settings-content';
import {
  fetchPublicSiteSettings,
  hasPublishedContactDetails,
  isContactFormAvailable,
} from './site-settings-content';
import { shellCopy, type Locale } from './navigation';

export type ContactPageModel =
  | { status: 'unavailable' }
  | { status: 'ready'; contact: PublicContactBlockOut; formEnabled: boolean };

export interface ContactFormState {
  sent: boolean;
  failed: boolean;
  values: {
    name: string;
    email: string;
    message: string;
  };
}

/** UI chrome for the progressive-enhancement contact form — not owner contact content. */
export const contactFormCopy = {
  formIntro: { en: 'Send a message', fa: 'ارسال پیام' },
  nameLabel: { en: 'Name', fa: 'نام' },
  emailLabel: { en: 'Email', fa: 'ایمیل' },
  messageLabel: { en: 'Message', fa: 'پیام' },
  sendLabel: { en: 'Send message', fa: 'ارسال پیام' },
  sentHeading: {
    en: 'Your message was sent.',
    fa: 'پیام شما ارسال شد.',
  },
  errorHeading: {
    en: 'Your message could not be sent. Review the fields and try again.',
    fa: 'پیام ارسال نشد. فیلدها را بررسی کنید و دوباره تلاش کنید.',
  },
  detailLabels: {
    email: { en: 'Email', fa: 'ایمیل' },
    linkedin: { en: 'LinkedIn', fa: 'لینکدین' },
    orcid: { en: 'ORCID', fa: 'ORCID' },
    employer: { en: 'Work', fa: 'محل کار' },
    location: { en: 'Location', fa: 'موقعیت' },
  },
} as const;

export function getContactRouteTitle(locale: Locale): string {
  return shellCopy.contact[locale];
}

export function getContactUnavailableCopy(locale: Locale): { title: string; message: string } {
  return locale === 'en'
    ? {
        title: getContactRouteTitle('en'),
        message: 'Published contact details are not available yet.',
      }
    : {
        title: getContactRouteTitle('fa'),
        message: 'اطلاعات تماس منتشرشده هنوز در دسترس نیست.',
      };
}

export async function fetchContactPageModel(): Promise<ContactPageModel> {
  const settings = await fetchPublicSiteSettings();
  const contact = settings?.contact;

  if (!hasPublishedContactDetails(contact) && !isContactFormAvailable(contact)) {
    return { status: 'unavailable' };
  }

  return {
    status: 'ready',
    contact: contact ?? {
      email: '',
      employer: '',
      employerUrl: '',
      formEnabled: false,
      linkedin: '',
      location: '',
      orcid: '',
    },
    formEnabled: isContactFormAvailable(contact),
  };
}

export function parseContactFormState(searchParams: URLSearchParams): ContactFormState {
  return {
    sent: searchParams.get('sent') === '1',
    failed: searchParams.get('sent') === '0',
    values: {
      name: searchParams.get('name') ?? '',
      email: searchParams.get('email') ?? '',
      message: searchParams.get('message') ?? '',
    },
  };
}

export function formatExternalLinkLabel(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

/** Same-origin POST target for progressive-enhancement form navigation. */
export function getContactFormActionUrl(): string {
  return '/api/contact';
}

export function resolveContactAlternateAvailability(model: ContactPageModel): boolean {
  return model.status === 'ready';
}
