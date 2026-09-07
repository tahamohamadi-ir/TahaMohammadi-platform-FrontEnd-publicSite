export interface ConceptAlignmentCapture {
  id: string
  family: string
  name: string
  path: string
  locale: 'en' | 'fa'
  dir: 'ltr' | 'rtl'
  theme?: 'light' | 'dark'
}

export const CONCEPT_ALIGNMENT_WIDTHS = [
  { width: 320, height: 568, label: '320 mobile small' },
  { width: 390, height: 844, label: '390 mobile standard' },
  { width: 768, height: 1024, label: '768 tablet portrait' },
  { width: 1024, height: 768, label: '1024 tablet landscape' },
  { width: 1280, height: 800, label: '1280 laptop' },
  { width: 1440, height: 900, label: '1440 desktop' },
] as const

/**
 * All 15 page families (F01..F15) from concept-alignment-v2 / PRODUCT-SPEC.md.
 */
export const CONCEPT_ALIGNMENT_CAPTURES: ConceptAlignmentCapture[] = [
  // F01 — Language Gateway / Portal
  { id: 'f01-gateway', family: 'F01', name: 'Language Gateway', path: '/', locale: 'fa', dir: 'rtl' },

  // F02 — Home
  { id: 'f02-home-fa', family: 'F02', name: 'Home FA', path: '/fa/', locale: 'fa', dir: 'rtl' },
  { id: 'f02-home-en', family: 'F02', name: 'Home EN', path: '/en/', locale: 'en', dir: 'ltr' },

  // F03 — Research
  { id: 'f03-research-fa', family: 'F03', name: 'Research FA', path: '/fa/research/', locale: 'fa', dir: 'rtl' },
  { id: 'f03-research-en', family: 'F03', name: 'Research EN', path: '/en/research/', locale: 'en', dir: 'ltr' },

  // F04 — Publications
  { id: 'f04-publications-fa', family: 'F04', name: 'Publications FA', path: '/fa/publications/', locale: 'fa', dir: 'rtl' },
  { id: 'f04-publications-en', family: 'F04', name: 'Publications EN', path: '/en/publications/', locale: 'en', dir: 'ltr' },

  // F05 — Projects
  { id: 'f05-projects-fa', family: 'F05', name: 'Projects FA', path: '/fa/projects/', locale: 'fa', dir: 'rtl' },
  { id: 'f05-projects-en', family: 'F05', name: 'Projects EN', path: '/en/projects/', locale: 'en', dir: 'ltr' },

  // F06 — Blog
  { id: 'f06-blog-fa', family: 'F06', name: 'Blog FA', path: '/fa/blog/', locale: 'fa', dir: 'rtl' },
  { id: 'f06-blog-en', family: 'F06', name: 'Blog EN', path: '/en/blog/', locale: 'en', dir: 'ltr' },

  // F07 — Education / Courses
  { id: 'f07-education-fa', family: 'F07', name: 'Education FA', path: '/fa/education/', locale: 'fa', dir: 'rtl' },
  { id: 'f07-education-en', family: 'F07', name: 'Education EN', path: '/en/education/', locale: 'en', dir: 'ltr' },

  // F08 — Gallery / Creative Works
  { id: 'f08-gallery-fa', family: 'F08', name: 'Gallery FA', path: '/fa/gallery/', locale: 'fa', dir: 'rtl' },
  { id: 'f08-gallery-en', family: 'F08', name: 'Gallery EN', path: '/en/gallery/', locale: 'en', dir: 'ltr' },

  // F09 — Books
  { id: 'f09-books-fa', family: 'F09', name: 'Books FA', path: '/fa/books/', locale: 'fa', dir: 'rtl' },
  { id: 'f09-books-en', family: 'F09', name: 'Books EN', path: '/en/books/', locale: 'en', dir: 'ltr' },

  // F10 — Talks
  { id: 'f10-talks-fa', family: 'F10', name: 'Talks FA', path: '/fa/talks/', locale: 'fa', dir: 'rtl' },
  { id: 'f10-talks-en', family: 'F10', name: 'Talks EN', path: '/en/talks/', locale: 'en', dir: 'ltr' },

  // F11 — Resources
  { id: 'f11-resources-fa', family: 'F11', name: 'Resources FA', path: '/fa/resources/', locale: 'fa', dir: 'rtl' },
  { id: 'f11-resources-en', family: 'F11', name: 'Resources EN', path: '/en/resources/', locale: 'en', dir: 'ltr' },

  // F12 — Collections
  { id: 'f12-collections-fa', family: 'F12', name: 'Collections FA', path: '/fa/collections/', locale: 'fa', dir: 'rtl' },
  { id: 'f12-collections-en', family: 'F12', name: 'Collections EN', path: '/en/collections/', locale: 'en', dir: 'ltr' },

  // F13 — About & CV
  { id: 'f13-about-fa', family: 'F13', name: 'About FA', path: '/fa/about/', locale: 'fa', dir: 'rtl' },
  { id: 'f13-about-en', family: 'F13', name: 'About EN', path: '/en/about/', locale: 'en', dir: 'ltr' },
  { id: 'f13-cv-fa', family: 'F13', name: 'CV FA', path: '/fa/cv/', locale: 'fa', dir: 'rtl' },
  { id: 'f13-cv-en', family: 'F13', name: 'CV EN', path: '/en/cv/', locale: 'en', dir: 'ltr' },

  // F14 — Contact
  { id: 'f14-contact-fa', family: 'F14', name: 'Contact FA', path: '/fa/contact/', locale: 'fa', dir: 'rtl' },
  { id: 'f14-contact-en', family: 'F14', name: 'Contact EN', path: '/en/contact/', locale: 'en', dir: 'ltr' },

  // F15 — System: Search & 404
  { id: 'f15-search-fa', family: 'F15', name: 'Search FA', path: '/fa/search/', locale: 'fa', dir: 'rtl' },
  { id: 'f15-search-en', family: 'F15', name: 'Search EN', path: '/en/search/', locale: 'en', dir: 'ltr' },
  { id: 'f15-404-fa', family: 'F15', name: '404 Fallback', path: '/fa/non-existent-page-fallback/', locale: 'fa', dir: 'rtl' },
]
