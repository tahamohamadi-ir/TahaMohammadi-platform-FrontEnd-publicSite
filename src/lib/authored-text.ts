/**
 * Authored rich-text helpers. The CMS stores HTML/Markdown in content bodies;
 * pages must not leak raw tags and must not inject unsanitized HTML. These
 * helpers convert authored block structure into plain escaped paragraphs.
 */

const HTML_BLOCK_BOUNDARY =
  /<\/(?:p|div|h[1-6]|li|ul|ol|blockquote|section|article|figure|figcaption|tr|td|th)>/gi
const HTML_LINE_BREAK = /<br\s*\/?>/gi

export function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
}

export function splitAuthoredParagraphs(
  body: string | null | undefined,
): string[] {
  if (!body?.trim()) return []
  const stripped = decodeEntities(
    body
      .replace(/\r\n?/g, '\n')
      .replace(HTML_LINE_BREAK, '\n')
      .replace(HTML_BLOCK_BOUNDARY, '\n\n')
      .replace(/<[^>]*>/g, ''),
  )
  return stripped
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split('\n')
        .map((line) =>
          line
            .replace(/^\s*(?:[-+*>]|\d+[.)])\s+/, '')
            .replace(/^\s*#{1,6}\s+/, '')
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
            .replace(/(^|\s)[*_~`]{1,3}|[*_~`]{1,3}(?=\s|$)/g, '$1')
            .trim(),
        )
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
}
