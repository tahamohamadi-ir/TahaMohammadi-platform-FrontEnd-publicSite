/** Gives an article body's h2/h3 headings stable anchor ids and returns them as an outline. */

export interface OutlineHeading {
  id: string
  text: string
  level: 2 | 3
}

const HEADING = /<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi
const AUTHORED_ID = /\sid\s*=\s*["']([^"']+)["']/i

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export function outlineArticleHtml(html: string): {
  html: string
  headings: OutlineHeading[]
} {
  const headings: OutlineHeading[] = []
  const used = new Map<string, number>()
  const unique = (base: string) => {
    const count = (used.get(base) ?? 0) + 1
    used.set(base, count)
    return count === 1 ? base : `${base}-${count}`
  }

  const out = html.replace(
    HEADING,
    (match, level: string, attrs = '', inner: string) => {
      const text = plainText(inner)
      if (!text) return match
      const authored = AUTHORED_ID.exec(attrs)?.[1]
      const id = authored
        ? unique(authored)
        : unique(slugify(text) || `section-${headings.length + 1}`)
      headings.push({ id, text, level: level === '2' ? 2 : 3 })
      return authored
        ? match
        : `<h${level}${attrs} id="${id}">${inner}</h${level}>`
    },
  )
  return { html: headings.length ? out : html, headings }
}
