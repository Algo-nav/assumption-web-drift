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

// A company logo scaled to fit a max height and a max width, or a two-letter monogram tile (ink on white) when
// there is no logo file or the fitted logo would be under LOGO_MIN_H tall. `ratio` (width / height) comes from logoRatio() on the server, so the rendered size is
// fixed in the markup and the same on server and client. The box is exactly the scaled logo, so it sits at the
// left of its slot; the parent's align-items centres it on the text line.
// The logo is decorative: the ticker or the name always sits next to it.
export default function Logo({ ticker, ratio, max = LOGO_TILE }) {
  const size = logoSize(ratio, max);
  if (size) {
    const { w, h } = size;
    const px = (v) => Math.round(v * 100) / 100;
    return (
      // A plain <img>: the files are small static SVGs, which next/image would pass through unoptimised anyway.
      // eslint-disable-next-line @next/next/no-img-element
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
    );
  }
  return (
    <span className="logo-mono" aria-hidden="true" style={{ height: max.h, width: max.h, fontSize: Math.round(max.h * 0.45) }} data-logo-mono={ticker}>
      {monogram(ticker)}
    </span>
  );
}
