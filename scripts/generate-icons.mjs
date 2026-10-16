// Builds public/pepper-face.svg and the app icons from public/pepper-detailed-face.svg.
// Run after replacing the source art: node scripts/generate-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = fileURLToPath(new URL('..', import.meta.url))
const source = readFileSync(`${root}public/pepper-detailed-face.svg`, 'utf8')
const [, sourceWidth, sourceHeight] = source.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number)
// One decimal is invisible at icon sizes and shrinks the file by about a third.
const linework = source.match(/ d="([^"]+)"/)[1].replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10))
const outline = linework.split(/(?=M )/)[0]

// The source is black linework on transparency, so Pepper's light fur would take the
// color of whatever is behind her (and vanish in dark mode). A cream fill inside her
// outline, widened into a thin sticker edge, keeps her readable on any surface.
const cream = '#f6ead9'
const face = [
    `<path d="${outline}" fill="${cream}" stroke="${cream}" stroke-width="20" stroke-linejoin="round"/>`,
    // Gaps between the mustache strands reach inside the outline; fill behind the muzzle too.
    `<ellipse cx="243" cy="320" rx="105" ry="115" fill="${cream}"/>`,
    `<path d="${linework}" fill="#000"/>`,
].join('')
const side = Math.max(sourceWidth, sourceHeight) + 24
const faceViewBox = [(sourceWidth - side) / 2, (sourceHeight - side) / 2, side, side].map((n) => Math.round(n * 100) / 100).join(' ')

writeFileSync(`${root}public/pepper-face.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${faceViewBox}">${face}</svg>\n`)
console.log('wrote public/pepper-face.svg')

// Drawn on a 100-unit canvas. Pepper's head stays inside the central 80% circle
// so Android's maskable crop (circle, squircle, teardrop) never clips her ears.
function iconSvg({ rounded }) {
    const clip = rounded ? ' clip-path="url(#tile)"' : ''
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6a531"/>
      <stop offset="1" stop-color="#df5719"/>
    </linearGradient>
    <clipPath id="tile"><rect width="100" height="100" rx="22"/></clipPath>
  </defs>
  <g${clip}>
    <rect width="100" height="100" fill="url(#bg)"/>
    <svg x="17" y="17" width="66" height="66" viewBox="${faceViewBox}">${face}</svg>
  </g>
</svg>`
}

function render(svg, size) {
    return sharp(Buffer.from(svg), { density: Math.max(72, (size / 100) * 72) })
        .resize(size, size)
        .png({ compressionLevel: 9 })
        .toBuffer()
}

// ICO container holding PNG images (supported by every current browser).
function ico(pngs) {
    const header = Buffer.alloc(6 + 16 * pngs.length)
    header.writeUInt16LE(0, 0)
    header.writeUInt16LE(1, 2)
    header.writeUInt16LE(pngs.length, 4)
    let offset = header.length
    pngs.forEach(({ size, data }, i) => {
        const entry = 6 + 16 * i
        header.writeUInt8(size >= 256 ? 0 : size, entry)
        header.writeUInt8(size >= 256 ? 0 : size, entry + 1)
        header.writeUInt16LE(1, entry + 4)
        header.writeUInt16LE(32, entry + 6)
        header.writeUInt32LE(data.length, entry + 8)
        header.writeUInt32LE(offset, entry + 12)
        offset += data.length
    })
    return Buffer.concat([header, ...pngs.map(({ data }) => data)])
}

const fullBleed = iconSvg({ rounded: false })
const tile = iconSvg({ rounded: true })

const outputs = [
    ['public/icon-192.png', tile, 192],
    ['public/icon-512.png', tile, 512],
    ['public/icon-maskable-192.png', fullBleed, 192],
    ['public/icon-maskable-512.png', fullBleed, 512],
    ['public/apple-touch-icon.png', fullBleed, 180],
]
for (const [path, svg, size] of outputs) {
    writeFileSync(`${root}${path}`, await render(svg, size))
    console.log(`wrote ${path}`)
}

const favicons = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await render(tile, size) })))
writeFileSync(`${root}app/favicon.ico`, ico(favicons))
console.log('wrote app/favicon.ico')
