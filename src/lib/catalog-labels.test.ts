import { describe, expect, it } from 'vitest'

import {
  formatAcademicStage,
  formatAccessState,
  formatAvailability,
  formatCourseFormat,
  formatCourseLanguage,
  formatCourseLevel,
  formatCreativeWorkType,
  formatDownloadType,
  formatLicense,
  formatPublicationType,
} from './catalog-labels'

describe('catalog labels', () => {
  it('translates CMS choice tokens and keeps written labels', () => {
    expect(formatAccessState('metadata_only', 'en')).toBe('Metadata only')
    expect(formatAccessState('metadata_only', 'fa')).toBe('فقط فراداده')
    expect(formatAccessState('Public', 'en')).toBe('Public')
    expect(formatAccessState('Open Access', 'en')).toBe('Open Access')

    expect(formatPublicationType('book_chapter', 'fa')).toBe('فصل کتاب')
    expect(formatPublicationType('Conference paper', 'en')).toBe(
      'Conference paper',
    )
    expect(formatAcademicStage('in_press', 'en')).toBe('In press')
    expect(formatAcademicStage('in_press', 'fa')).toBe('در نوبت چاپ')

    expect(formatDownloadType('dataset', 'fa')).toBe('مجموعهٔ داده')
    expect(formatCourseLevel('all_levels', 'fa')).toBe('همهٔ سطح‌ها')
    expect(formatCourseLevel('Graduate', 'en')).toBe('Graduate')
    expect(formatCourseFormat('in_person', 'en')).toBe('In person')
    expect(formatCourseFormat('Online', 'en')).toBe('Online')
    expect(formatCourseLanguage('fa', 'en')).toBe('Persian')
    expect(formatCourseLanguage('English', 'fa')).toBe('English')
    expect(formatAvailability('available_on_request', 'fa')).toBe('با درخواست')
    expect(formatAvailability('Open', 'en')).toBe('Open')
    expect(formatLicense('cc-by-nc-4', 'fa')).toBe('CC BY-NC 4.0')
    expect(formatLicense('MIT', 'en')).toBe('MIT')
    expect(formatCreativeWorkType('photography', 'fa')).toBe('عکاسی')
    expect(formatCreativeWorkType('Photography', 'en')).toBe('Photography')
    expect(formatAccessState('', 'en')).toBe('')
    expect(formatAccessState(null, 'fa')).toBe('')
  })
})
