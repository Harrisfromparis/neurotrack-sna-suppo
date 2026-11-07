import logoFull from '@/assets/brand/logo-full.webp'
import logoReversed from '@/assets/brand/logo-full-reversed.webp'

/**
 * The Autism & Me logo lockup.
 *
 * These are the supplied master files; the logo is never redrawn or
 * regenerated. Rules from the brand kit, encoded here so call sites cannot
 * get them wrong:
 *
 *  - `ground` picks the file: cream and white take the black wording,
 *    teal and black take the reversed (white) wording.
 *  - `ground="page"` (the default) follows the page, which is cream in light
 *    mode and Night in dark mode, so it swaps to the reversed file under
 *    prefers-color-scheme: dark. Without that, the black domain line
 *    disappears against Night.
 *  - Never place the logo on dusty blue, where the blue arc disappears.
 *    There is deliberately no `dusty` ground.
 *  - Minimum width for the full lockup is 120px; the knot alone is for
 *    favicons and app icons only and is not exposed here.
 *  - Clear space equals the height of the domain line, about an eighth of
 *    the lockup height.
 */
interface LogoProps {
  ground?: 'page' | 'cream' | 'white' | 'teal' | 'black'
  /** Rendered width in pixels. The kit's minimum is 120. */
  width?: number
  className?: string
}

const MIN_WIDTH = 120
const ASPECT = 362 / 345

export function Logo({ ground = 'page', width = MIN_WIDTH, className = '' }: LogoProps) {
  const renderedWidth = Math.max(width, MIN_WIDTH)
  const height = Math.round(renderedWidth / ASPECT)
  const style = {
    width: renderedWidth,
    height: 'auto',
    // Clear space: the height of the domain line
    padding: Math.round(renderedWidth / 8),
  }
  const alt = 'Autism and Me, autismandme.ie'

  const img = (src: string) => (
    <img src={src} alt={alt} width={renderedWidth} height={height} className={className} style={style} />
  )

  if (ground === 'teal' || ground === 'black') return img(logoReversed)
  if (ground === 'cream' || ground === 'white') return img(logoFull)

  // Follows the page ground through the colour scheme.
  return (
    <picture>
      <source srcSet={logoReversed} media="(prefers-color-scheme: dark)" />
      {img(logoFull)}
    </picture>
  )
}
