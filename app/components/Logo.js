import { monogram } from "../lib/monogram";

// The two sizes the site uses: a logo scales to fit inside both limits.
export const LOGO_TILE = { h: 20, w: 56 };
export const LOGO_PAGE = { h: 40, w: 200 };
// A logo whose fitted height would be under this is too small to read (a wide wordmark in a narrow cap):
// the monogram tile is shown instead.
export const LOGO_MIN_H = 14;

// The fitted size of a logo inside `max`, or null when there is no logo or it would be under LOGO_MIN_H tall.
export function logoSize(ratio, max) {
  if (!ratio) return null;
  const w = Math.min(max.w, max.h * ratio);
  const h = w / ratio;
  return h < LOGO_MIN_H ? null : { w, h };
}

// A company logo scaled to fit a max height and a max width, or a two-letter monogram (ink on powder) when
// there is no logo file or the fitted logo would be under LOGO_MIN_H tall. `ratio` (width / height) comes from
// logoRatio() on the server, so the rendered size is fixed in the markup and the same on server and client.
// The brand files keep their own colours, which were drawn for a light ground, so the logo sits on a powder
// plate: PLATE_PAD of powder on every side, the plate as tall as the tallest logo of that size. The box of the
// image itself is exactly the scaled logo.
// The logo is decorative: the ticker or the name always sits next to it.
const PLATE_PAD = { tile: 4, page: 8 };

export default function Logo({ ticker, ratio, max = LOGO_TILE }) {
  const size = logoSize(ratio, max);
  const big = max.h >= LOGO_PAGE.h;
  const pad = big ? PLATE_PAD.page : PLATE_PAD.tile;
  const plate = { height: max.h + 2 * pad, padding: `0 ${pad}px` };
  if (size) {
    const { w, h } = size;
    const px = (v) => Math.round(v * 100) / 100;
    return (
      <span className={`logo-plate${big ? " lg" : ""}`} style={plate}>
        {/* A plain <img>: the files are small static SVGs, which next/image would pass through unoptimised anyway. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="logo"
          src={`/logos/${ticker}.svg`}
          alt=""
          width={Math.round(w)}
          height={Math.round(h)}
          style={{ width: px(w), height: px(h) }}
          decoding="async"
          data-logo={ticker}
        />
      </span>
    );
  }
  return (
    <span className={`logo-plate${big ? " lg" : ""}`} style={plate} aria-hidden="true">
      <span className="logo-mono" style={{ height: max.h, width: max.h, fontSize: Math.round(max.h * 0.45) }} data-logo-mono={ticker}>
        {monogram(ticker)}
      </span>
    </span>
  );
}
