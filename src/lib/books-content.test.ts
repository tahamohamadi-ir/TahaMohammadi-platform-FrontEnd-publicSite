import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import CollectionPage from '../components/books/CollectionPage.astro'
import DetailPage from '../components/books/DetailPage.astro'

type Component = Parameters<
  Awaited<ReturnType<typeof AstroContainer.create>>['renderToString']
>[0]

async function render(
  component: Component,
  props: Record<string, unknown> = {},
) {
  const container = await AstroContainer.create()
  return container.renderToString(component, { props })
}

describe('PU-16 Books Product Family', () => {
  it('renders books collection page with books list', async () => {
    const html = await render(CollectionPage, {
      locale: 'en',
      model: {
        status: 'ready',
        books: [
          {
            locale: 'en',
            slug: 'principles-of-distributed-systems',
            title: 'Principles of Distributed Systems',
            authors: 'Taha Mohammadi',
            isbn: '978-0-123456-78-9',
            publisher: 'Academic Press',
            publication_date: '2026-01-15',
            license: 'CC-BY-4.0',
            access_state: 'Open Access',
            published_at: '2026-01-15T00:00:00Z',
            updated_at: null,
          },
        ],
      },
    })

    expect(html).toContain('Principles of Distributed Systems')
    expect(html).toContain('Taha Mohammadi')
    expect(html).toContain('/en/books/principles-of-distributed-systems')
  })

  it('renders CMS story document when story is present on book', async () => {
    const html = await render(DetailPage, {
      locale: 'en',
      model: {
        status: 'ready',
        book: {
          locale: 'en',
          slug: 'principles-of-distributed-systems',
          title: 'Principles of Distributed Systems',
          authors: 'Taha Mohammadi',
          isbn: '978-0-123456-78-9',
          publisher: 'Academic Press',
          publication_date: '2026-01-15',
          license: 'CC-BY-4.0',
          access_state: 'Open Access',
          published_at: '2026-01-15T00:00:00Z',
          updated_at: null,
          description: 'Fallback book overview.',
          url: 'https://books.example.com/pds',
          accessibility_notes: 'Screen-reader optimized EPUB and PDF available.',
          cover: {
            url: 'https://cdn.example.com/covers/pds.jpg',
            alt: 'Cover of Principles of Distributed Systems',
          },
          story: {
            locale: 'en',
            title: 'Book Overview Story',
            sections: [
              {
                layout: '1col',
                blocks: [
                  {
                    blockType: 'heading',
                    settings: {
                      text: 'Preface and Architectural Vision',
                      level: 2,
                      id: 'preface',
                    },
                  },
                  {
                    blockType: 'text',
                    settings: {
                      body: '<p>This volume unifies theoretical distributed consensus with practical high-concurrency systems.</p>',
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    })

    expect(html).toContain('Preface and Architectural Vision')
    expect(html).toContain('This volume unifies theoretical distributed consensus')
    expect(html).toContain('Academic Press')
    expect(html).toContain('978-0-123456-78-9')
    expect(html).toContain('Cover of Principles of Distributed Systems')
  })

  it('renders fallback description when story is absent', async () => {
    const html = await render(DetailPage, {
      locale: 'en',
      model: {
        status: 'ready',
        book: {
          locale: 'en',
          slug: 'intro-to-computational-logic',
          title: 'Introduction to Computational Logic',
          authors: 'Taha Mohammadi',
          isbn: '978-0-987654-32-1',
          publisher: 'Tech University Press',
          publication_date: '2025-10-01',
          license: 'MIT',
          access_state: 'Public',
          published_at: '2025-10-01T00:00:00Z',
          updated_at: null,
          description: 'A concise introduction to automated theorem proving and model checking.',
          url: '',
          accessibility_notes: '',
          cover: null,
          story: null,
        },
      },
    })

    expect(html).toContain('Introduction to Computational Logic')
    expect(html).toContain('A concise introduction to automated theorem proving and model checking.')
  })

  it('renders Persian book detail with proper RTL labels', async () => {
    const html = await render(DetailPage, {
      locale: 'fa',
      model: {
        status: 'ready',
        book: {
          locale: 'fa',
          slug: 'distributed-systems-fa',
          title: 'مبانی سامانه‌های توزیع‌شده',
          authors: 'طاها محمدی',
          isbn: '۹۷۸-۶۰۰-۰۰۰۰-۰۰-۰',
          publisher: 'انتشارات دانش',
          publication_date: '۱۴۰۴-۱۰-۰۱',
          license: 'CC-BY-4.0',
          access_state: 'دسترسی آزاد',
          published_at: '2026-01-15T00:00:00Z',
          updated_at: null,
          description: 'مرجع دانشگاهی برای درس سیستم‌های توزیع‌شده پیشرفته.',
          url: '',
          accessibility_notes: '',
          cover: null,
          story: null,
        },
      },
    })

    expect(html).toContain('مبانی سامانه‌های توزیع‌شده')
    expect(html).toContain('طاها محمدی')
    expect(html).toContain('انتشارات دانش')
    expect(html).toContain('نویسندگان')
    expect(html).toContain('← بازگشت به کتاب‌ها')
  })
})
