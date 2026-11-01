import { describe, expect, it } from 'vitest'
import { outlineArticleHtml } from './article-outline'

describe('outlineArticleHtml', () => {
  it('ids every h2/h3 and lists them in order', () => {
    const out = outlineArticleHtml(
      '<p>Intro</p><h2>Shared core</h2><p>a</p><h3 class="x">Edge <em>runtime</em></h3><h2>Evaluation plan</h2>',
    )
    expect(out.headings).toEqual([
      { id: 'shared-core', text: 'Shared core', level: 2 },
      { id: 'edge-runtime', text: 'Edge runtime', level: 3 },
      { id: 'evaluation-plan', text: 'Evaluation plan', level: 2 },
    ])
    expect(out.html).toBe(
      '<p>Intro</p><h2 id="shared-core">Shared core</h2><p>a</p><h3 class="x" id="edge-runtime">Edge <em>runtime</em></h3><h2 id="evaluation-plan">Evaluation plan</h2>',
    )
  })

  it('keeps an authored id and de-duplicates repeated titles', () => {
    const out = outlineArticleHtml(
      '<h2 id="start">Start</h2><h2>Notes</h2><h2>Notes</h2>',
    )
    expect(out.headings.map((heading) => heading.id)).toEqual([
      'start',
      'notes',
      'notes-2',
    ])
  })

  it('builds readable ids from Persian headings', () => {
    const out = outlineArticleHtml('<h2>هستهٔ مشترک</h2><h2>طرح ارزیابی</h2>')
    expect(out.headings[0]?.id).toBe('هستهٔ-مشترک')
    expect(out.html).toContain('<h2 id="طرح-ارزیابی">')
  })

  it('falls back to a numbered id when a heading has no letters', () => {
    const out = outlineArticleHtml('<h2>***</h2><h2>2026</h2>')
    expect(out.headings.map((heading) => heading.id)).toEqual([
      'section-1',
      '2026',
    ])
  })

  it('leaves html without headings untouched', () => {
    const html = '<p>No sections <strong>here</strong>.</p>'
    expect(outlineArticleHtml(html)).toEqual({ html, headings: [] })
  })
})
