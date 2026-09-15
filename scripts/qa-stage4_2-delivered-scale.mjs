#!/usr/bin/env node
/**
 * Stage 4.2 — delivered-scale evaluation of the relation curves.
 *
 * The acceptance surface is the browser, not Blender: a 1600x1400 PNG proves nothing about a line
 * that ends up ~1.5 raster pixels wide at Home's composed size. For every candidate this script
 * replays the real delivery chain and measures what actually survives:
 *
 *   alpha master PNG
 *     -> resize to the derivative width the browser picks (desktop 800, mobile 400)
 *     -> encode AVIF at the shipped quality (q66)
 *     -> resize to the measured display box and composite over the real card colour
 *     -> keep only thin structures (a chamfer distance transform discards the sphere blobs)
 *     -> measure ink, effective line width and local contrast on the curves alone
 *
 * Effective width uses area and perimeter of the thin ink mask: for a stroke, area = width x length
 * and perimeter = 2 x length, so width = 2 x area / perimeter, in delivered pixels.
 *
 * Usage:
 *   node scripts/qa-stage4_2-delivered-scale.mjs [--candidate B] [--out <dir>]
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const arg = (flag, fallback) =>
  process.argv.includes(flag)
    ? process.argv[process.argv.indexOf(flag) + 1]
    : fallback

const CANDIDATES_DIR = path.resolve(
  arg(
    '--candidates',
    path.join(
      ROOT,
      '..',
      '..',
      'Design-Assets',
      'hero-v2',
      'renders',
      'stage4_2',
      'candidates',
    ),
  ),
)
const OUT = path.resolve(
  arg('--out', path.join(ROOT, 'docs', 'quality', 'hero-v2-stage4_2')),
)
const ONLY = arg('--candidate', null)

/** Browser-delivered geometry, measured on the real composed page in Stage 4.1. */
const DEVICES = {
  desktop: { derivative: 800, box: { width: 511, height: 447 } },
  mobile: { derivative: 400, box: { width: 348, height: 348 } },
}
const THEMES = ['dark', 'light']
const STATE = '03'
const QUALITY = 66
/** Card colours sampled from the Stage 4.1 delivery screenshots at both viewports. */
const BACKGROUNDS = {
  'desktop-dark': { r: 10, g: 18, b: 46 },
  'desktop-light': { r: 254, g: 254, b: 254 },
  'mobile-dark': { r: 10, g: 18, b: 46 },
  'mobile-light': { r: 254, g: 254, b: 254 },
}
/**
 * A pixel counts as ink only when it departs far enough from the card colour that encoder noise
 * cannot explain it. At 24 the anti-aliased rim of every sphere counted as ink; at 60 the rims stop
 * qualifying and the measurement is left with real drawn material.
 */
const INK_DISTANCE = 60
/** Radius (px) around a blob that is excluded: the contact zone belongs to the node, not the line. */
const BLOB_EXCLUSION_PX = 2

const relativeLuminance = ({ r, g, b }) => {
  const channel = (value) => {
    const v = value / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

const contrastRatio = (a, b) => {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Two-pass chamfer distance to the nearest background pixel, in pixels. */
function thicknessMap(mask, width, height) {
  const INF = 1e6
  const dist = new Float32Array(width * height)
  for (let i = 0; i < dist.length; i += 1) dist[i] = mask[i] ? INF : 0
  const i = (x, y) => y * width + x
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = i(x, y)
      if (!mask[p]) continue
      let best = dist[p]
      if (x > 0) best = Math.min(best, dist[p - 1] + 1)
      if (y > 0) best = Math.min(best, dist[p - width] + 1)
      if (x > 0 && y > 0) best = Math.min(best, dist[p - width - 1] + 1.414)
      if (x < width - 1 && y > 0)
        best = Math.min(best, dist[p - width + 1] + 1.414)
      dist[p] = best
    }
  }
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const p = i(x, y)
      if (!mask[p]) continue
      let best = dist[p]
      if (x < width - 1) best = Math.min(best, dist[p + 1] + 1)
      if (y < height - 1) best = Math.min(best, dist[p + width] + 1)
      if (x < width - 1 && y < height - 1)
        best = Math.min(best, dist[p + width + 1] + 1.414)
      if (x > 0 && y < height - 1)
        best = Math.min(best, dist[p + width - 1] + 1.414)
      dist[p] = best
    }
  }
  return dist
}

/**
 * A relation stroke is thin; a sphere is a blob. Keeping only ink whose half-thickness stays under
 * three pixels isolates the curves, so the numbers describe the lines rather than the nodes.
 */
function _thinMask(mask, width, height, maxHalfThickness = 3) {
  const dist = thicknessMap(mask, width, height)
  const thin = new Uint8Array(width * height)
  for (let i = 0; i < thin.length; i += 1) {
    if (mask[i] && dist[i] <= maxHalfThickness) thin[i] = 1
  }
  return thin
}

function statsFor(pixels, width, height, mask) {
  let area = 0
  let perimeter = 0
  let r = 0
  let g = 0
  let b = 0
  const on = (x, y) =>
    x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!on(x, y)) continue
      const index = (y * width + x) * 3
      area += 1
      r += pixels[index]
      g += pixels[index + 1]
      b += pixels[index + 2]
      if (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1))
        perimeter += 1
    }
  }
  return {
    area,
    perimeter,
    inkMean: area ? { r: r / area, g: g / area, b: b / area } : null,
  }
}

async function deliveredBox(candidate, device, theme) {
  const master = path.join(
    CANDIDATES_DIR,
    candidate,
    'renders',
    'alpha',
    `${device}-${theme}-${STATE}.png`,
  )
  if (!existsSync(master)) return null
  const derivative = await sharp(master)
    .resize({ width: DEVICES[device].derivative, fit: 'inside' })
    .avif({ quality: QUALITY, effort: 4 })
    .toBuffer()
  const box = DEVICES[device].box
  const display = await sharp(derivative)
    .resize({ width: box.width, height: box.height, fit: 'contain' })
    .flatten({ background: BACKGROUNDS[`${device}-${theme}`] })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { master, derivativeBytes: derivative.length, ...display }
}

async function evaluate(candidate, device, theme) {
  const box = await deliveredBox(candidate, device, theme)
  if (!box) return { candidate, device, theme, status: 'missing master' }
  const { data, info } = box
  const background = BACKGROUNDS[`${device}-${theme}`]
  const all = new Uint8Array(info.width * info.height)
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * 3
      const distance =
        Math.abs(data[index] - background.r) +
        Math.abs(data[index + 1] - background.g) +
        Math.abs(data[index + 2] - background.b)
      if (distance > INK_DISTANCE) all[y * info.width + x] = 1
    }
  }
  const dist = thicknessMap(all, info.width, info.height)
  const thin = new Uint8Array(info.width * info.height)
  const blob = new Uint8Array(info.width * info.height)
  for (let i = 0; i < thin.length; i += 1) {
    if (!all[i]) continue
    if (dist[i] <= 3) thin[i] = 1
    else blob[i] = 1
  }
  // Exclude a small collar around every blob: a sphere's rim hugs the node and would otherwise be
  // measured as if it were a relation curve.
  const curveMask = new Uint8Array(info.width * info.height)
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (!thin[y * info.width + x]) continue
      let nearBlob = false
      for (
        let dy = -BLOB_EXCLUSION_PX;
        dy <= BLOB_EXCLUSION_PX && !nearBlob;
        dy += 1
      ) {
        for (let dx = -BLOB_EXCLUSION_PX; dx <= BLOB_EXCLUSION_PX; dx += 1) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height)
            continue
          if (blob[ny * info.width + nx]) {
            nearBlob = true
            break
          }
        }
      }
      if (!nearBlob) curveMask[y * info.width + x] = 1
    }
  }
  const curveStats = statsFor(data, info.width, info.height, curveMask)
  const allStats = statsFor(data, info.width, info.height, all)
  const effectiveWidthPx =
    curveStats.perimeter > 0 ? (2 * curveStats.area) / curveStats.perimeter : 0
  const contrast = curveStats.inkMean
    ? contrastRatio(curveStats.inkMean, background)
    : 0
  return {
    candidate,
    device,
    theme,
    status: 'ok',
    derivativeBytes: box.derivativeBytes,
    displayBox: { width: info.width, height: info.height },
    curveInkPixels: curveStats.area,
    thinInkPixels: thin.reduce((acc, v) => acc + v, 0),
    blobInkPixels: blob.reduce((acc, v) => acc + v, 0),
    allInkPixels: allStats.area,
    blobSharePct: allStats.area
      ? Number(((1 - curveStats.area / allStats.area) * 100).toFixed(1))
      : 0,
    effectiveLineWidthPx: Number(effectiveWidthPx.toFixed(3)),
    contrastRatio: Number(contrast.toFixed(2)),
    inkRgb: curveStats.inkMean
      ? [curveStats.inkMean.r, curveStats.inkMean.g, curveStats.inkMean.b].map(
          (v) => Math.round(v),
        )
      : null,
    backgroundRgb: [background.r, background.g, background.b],
  }
}

const candidates = ONLY ? [ONLY] : ['A', 'B', 'C', 'D']
mkdirSync(OUT, { recursive: true })
const rows = []
for (const candidate of candidates) {
  for (const device of Object.keys(DEVICES)) {
    for (const theme of THEMES) {
      const row = await evaluate(candidate, device, theme)
      rows.push(row)
      if (row.status === 'ok') {
        console.log(
          `${candidate} ${device}/${theme} curvePx=${row.curveInkPixels} width=${row.effectiveLineWidthPx}px contrast=${row.contrastRatio}:1 ink=${row.inkRgb} bg=${row.backgroundRgb} blobs=${row.blobSharePct}%`,
        )
      } else {
        console.log(`${candidate} ${device}/${theme} ${row.status}`)
      }
    }
  }
}

// ---------------------------------------------------------------- delivered-scale sheet (§11)
const PANES = path.join(OUT, 'delivered-scales')
mkdirSync(PANES, { recursive: true })

async function pane(candidate, device, theme) {
  const box = await deliveredBox(candidate, device, theme)
  if (!box) return null
  const file = path.join(PANES, `${device}-${theme}-${candidate}.png`)
  await sharp(box.data, {
    raw: { width: box.info.width, height: box.info.height, channels: 3 },
  })
    .png()
    .toFile(file)
  return file
}

const label = (text, width) =>
  Buffer.from(
    `<svg width="${width}" height="26" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="${width}" height="26" fill="#111827"/>` +
      `<text x="8" y="18" font-family="monospace" font-size="13" fill="#f8fafc">${text}</text></svg>`,
  )

const sheetRows = []
for (const device of Object.keys(DEVICES)) {
  for (const theme of THEMES) {
    const files = []
    for (const candidate of candidates) {
      const file = await pane(candidate, device, theme)
      if (file) files.push({ candidate, file })
    }
    if (!files.length) continue
    const width = DEVICES[device].box.width * files.length
    const height = DEVICES[device].box.height
    const header = label(
      `${device} ${theme} | ${files.map((f) => f.candidate).join(' / ')} | delivered box ${DEVICES[device].box.width}px | AVIF q${QUALITY}`,
      width,
    )
    const rowFile = path.join(PANES, `row-${device}-${theme}.png`)
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 17, g: 24, b: 39 },
      },
    })
      .composite(
        files.map((entry, index) => ({
          input: entry.file,
          left: index * DEVICES[device].box.width,
          top: 0,
        })),
      )
      .png()
      .toBuffer()
      .then(async (body) => {
        await sharp({
          create: {
            width,
            height: height + 26,
            channels: 3,
            background: { r: 17, g: 24, b: 39 },
          },
        })
          .composite([
            { input: header, left: 0, top: 0 },
            { input: body, left: 0, top: 26 },
          ])
          .png()
          .toFile(rowFile)
      })
    sheetRows.push({
      device,
      theme,
      row: path.relative(OUT, rowFile).replace(/\\/g, '/'),
    })
  }
}

writeFileSync(
  path.join(OUT, 'delivered-scale.json'),
  `${JSON.stringify({ rows, sheetRows, candidates: candidates.length }, null, 2)}\n`,
)
console.log(`SHEET ${sheetRows.map((r) => r.row).join(', ')}`)
console.log(`SUMMARY ${path.join(OUT, 'delivered-scale.json')}`)
