/**
 * CV/resume page family — `GET /api/site` downloads projection (PUBLIC-230).
 * Renders unavailable when no owner-approved public download exists.
 */

import type { PublicDownloadOut } from './site-settings-content'
import {
  fetchPublicSiteSettings,
  hasPublishedDownloads,
} from './site-settings-content'
import { shellCopy, type Locale } from './navigation'

export type CvPageModel =
  | { status: 'unavailable' }
  | { status: 'ready'; downloads: PublicDownloadOut[] }

/** Approved seed.empty.cv.* unavailable copy — not a fabricated download. */
export function getCvUnavailableCopy(locale: Locale): {
  title: string
  message: string
} {
  return locale === 'en'
    ? {
        title: getCvRouteTitle('en'),
        message:
          'The current public CV is not yet available for download. A reviewed, owner-approved version will be linked here when ready.',
      }
    : {
        title: getCvRouteTitle('fa'),
        message:
          'نسخه عمومی رزومه هنوز برای دانلود آماده نیست. پس از بازبینی و تأیید مالک سایت، نسخه جاری از همین بخش در دسترس قرار می‌گیرد.',
      }
}

export function getCvRouteTitle(locale: Locale): string {
  return shellCopy.cv[locale]
}

export function formatDownloadMeta(download: PublicDownloadOut): string {
  const parts: string[] = []
  if (download.kind) parts.push(download.kind)
  if (download.updated_at) parts.push(download.updated_at)
  if (download.size_bytes > 0) {
    const kb = Math.round(download.size_bytes / 1024)
    parts.push(`${kb} KB`)
  }
  return parts.join(' · ')
}

export async function fetchCvPageModel(): Promise<CvPageModel> {
  const settings = await fetchPublicSiteSettings()
  const downloads = settings?.downloads ?? []

  if (!hasPublishedDownloads(downloads)) {
    return { status: 'unavailable' }
  }

  return { status: 'ready', downloads }
}

export function resolveCvAlternateAvailability(model: CvPageModel): boolean {
  return model.status === 'ready'
}
