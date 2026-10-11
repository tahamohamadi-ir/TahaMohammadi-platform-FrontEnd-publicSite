import { BLOG_PAGE_SIZE, matchBlogItem } from '../lib/writing-content'

const root = document.querySelector<HTMLElement>('[data-blog-index]')
if (root) {
  const search = root.querySelector<HTMLInputElement>('[data-blog-search]')
  const empty = root.querySelector<HTMLElement>('[data-blog-empty]')
  const pages = root.querySelector<HTMLElement>('[data-blog-pages]')
  const status = root.querySelector<HTMLElement>('[data-blog-page-status]')
  const prev = root.querySelector<HTMLButtonElement>('[data-blog-prev]')
  const next = root.querySelector<HTMLButtonElement>('[data-blog-next]')
  const filters = [
    ...root.querySelectorAll<HTMLButtonElement>('[data-blog-series-filter]'),
  ]
  const items = [...root.querySelectorAll<HTMLElement>('[data-blog-item]')]
  let seriesSlug: string | null = null
  let page = 1

  function render() {
    const query = search?.value ?? ''
    const matched = items.filter((item) =>
      matchBlogItem(
        {
          text: item.dataset.blogText ?? '',
          series: (item.dataset.blogSeries ?? '').split(' ').filter(Boolean),
        },
        query,
        seriesSlug,
      ),
    )
    const pageCount = Math.max(1, Math.ceil(matched.length / BLOG_PAGE_SIZE))
    page = Math.min(page, pageCount)
    const start = (page - 1) * BLOG_PAGE_SIZE
    const visible = new Set(matched.slice(start, start + BLOG_PAGE_SIZE))
    for (const item of items) item.hidden = !visible.has(item)
    if (empty) empty.hidden = matched.length > 0
    if (pages) pages.hidden = matched.length <= BLOG_PAGE_SIZE
    if (status) status.textContent = `${page} / ${pageCount}`
    if (prev) prev.disabled = page <= 1
    if (next) next.disabled = page >= pageCount
  }

  search?.addEventListener('input', () => {
    page = 1
    render()
  })
  for (const filter of filters) {
    filter.addEventListener('click', () => {
      seriesSlug = filter.dataset.blogSeriesFilter || null
      for (const candidate of filters) {
        candidate.setAttribute(
          'aria-pressed',
          candidate === filter ? 'true' : 'false',
        )
      }
      page = 1
      render()
    })
  }
  prev?.addEventListener('click', () => {
    page -= 1
    render()
  })
  next?.addEventListener('click', () => {
    page += 1
    render()
  })
  render()
}
