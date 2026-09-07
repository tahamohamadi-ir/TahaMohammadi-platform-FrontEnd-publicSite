import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { components } from '../../generated/public-api'
import StoryDocument from './StoryDocument.astro'

type Story = components['schemas']['StoryDocumentOut']
const media = (id: number, url: string) => ({
  id,
  url,
  mime: 'image/png',
  alt: 'Fallback alt',
  altFa: 'توضیح تصویر',
  altEn: 'Image description',
  title: 'Uploaded media',
})
const render = async (story: Story) =>
  (await AstroContainer.create()).renderToString(StoryDocument, {
    props: { story, locale: story.locale },
  })
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('Public story projection renders without JavaScript', () => {
  it.each(['en', 'fa'])(
    'renders projected media fields in %s',
    async (locale) => {
      const story: Story = {
        locale,
        title: 'Story',
        sections: [
          {
            layout: '1col',
            ratio: '1:1',
            blocks: [
              {
                blockType: 'gallery',
                settings: { media: [media(1, '/media/gallery.png')] },
              },
              {
                blockType: 'slider',
                settings: { media: [media(2, '/media/slide.png')] },
              },
              {
                blockType: 'video',
                settings: {
                  media: { ...media(3, '/media/video.mp4'), mime: 'video/mp4' },
                },
              },
              {
                blockType: 'audio',
                settings: {
                  media: {
                    ...media(4, '/media/audio.mp3'),
                    mime: 'audio/mpeg',
                  },
                },
              },
              {
                blockType: 'before_after',
                settings: {
                  beforeMedia: media(5, '/media/before.png'),
                  afterMedia: media(6, '/media/after.png'),
                },
              },
            ],
          },
        ],
      }
      const html = await render(story)
      for (const file of [
        'gallery.png',
        'slide.png',
        'video.mp4',
        'audio.mp3',
        'before.png',
        'after.png',
      ])
        expect(html).toContain(`src="/media/${file}"`)
      expect(html).toContain(
        locale === 'fa' ? 'alt="توضیح تصویر"' : 'alt="Image description"',
      )
    },
  )
  it('resolves backend family/id references into published titles and canonical links', async () => {
    vi.stubEnv('PUBLIC_API_BASE_URL', 'https://api.example.test')
    const item: components['schemas']['WorkRefOut'] = {
      family: 'article',
      id: '7',
      locale: 'en',
      slug: 'published-title',
      title: 'Published title',
      summary: '',
      routeFamily: 'blog',
    }
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [item],
          unresolved: [{ family: 'article', id: '8' }],
        }),
      ),
    )
    vi.stubGlobal('fetch', fetcher)
    const html = await render({
      locale: 'en',
      title: 'Story',
      sections: [
        {
          layout: '1col',
          ratio: '1:1',
          blocks: [
            {
              blockType: 'related',
              settings: {
                records: [
                  { family: 'article', id: '7' },
                  { family: 'article', id: '8' },
                ],
              },
            },
          ],
        },
      ],
    })
    expect(html).toContain('href="/en/blog/published-title/"')
    expect(html).toContain('Published title')
    expect(html).not.toContain('article #')
    expect(html).not.toContain('href="#"')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
