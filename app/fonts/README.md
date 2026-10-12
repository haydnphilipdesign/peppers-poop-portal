# Bundled fonts

The app bundles the Latin variable-font files for its existing Cormorant Garamond, Source Sans 3, and Geist Mono families. `app/layout.tsx` loads them through `next/font/local`, preserving the existing CSS variables, supported weights, preloading, and `font-display: swap`.

This removes Google Fonts requests from development and production compilation. Google occasionally returns valid WOFF2 files through extensionless URLs with query parameters that Next.js 16.1.6 cannot parse, causing otherwise identical builds to fail. See [Next.js issue #99114](https://github.com/vercel/next.js/issues/99114).

Files were downloaded from Google Fonts on October 12, 2026. The selected files contain variable weight axes; the layout declares 400–700 for heading/body text and 100–900 for the existing mono family. Each font's SIL Open Font License is included alongside it, obtained from the corresponding directory in the [Google Fonts source repository](https://github.com/google/fonts/tree/main/ofl).

| File | Google Fonts source |
| --- | --- |
| `cormorant-garamond-latin.woff2` | `https://fonts.gstatic.com/s/cormorantgaramond/v21/co3bmX5slCNuHLi8bLeY9MK7whWMhyjYqXtK.woff2` |
| `source-sans-3-latin.woff2` | `https://fonts.gstatic.com/s/sourcesans3/v20/nwpStKy2OAdR1K-IwhWudF-R3w8aZQ.woff2` |
| `geist-mono-latin.woff2` | `https://fonts.gstatic.com/s/geistmono/v6/or3nQ6H-1_WfwkMZI_qYFrcdmg.woff2` |

The source files are committed so deployments do not need to download or regenerate them. Characters outside the bundled Latin coverage use the configured fallback fonts.
