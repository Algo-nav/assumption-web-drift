// When each company's fiscal year ends, so chart x-axes can mark one tick per fiscal year.
//
// MAINTAINED BY HAND. This table is not derived from the dataset. When a company is added to the release, add its
// row here too; a ticker with no row falls back to calendar years (31 December), which misplaces the ticks for any
// company whose fiscal year ends elsewhere.
//
// Each row is one rule:
//   { date: [month, day] }                    a fixed date, e.g. 31 December
//   { last: weekday, month }                   the last <weekday> of <month>
//   { nearest: weekday, date: [month, day] }   the <weekday> nearest to <month> <day> (52/53-week years)
// Months are 1-12, weekdays 0 (Sunday) to 6 (Saturday). `offset` says which calendar year the end falls in for
// fiscal year N: 0 means N, 1 means N + 1 (Target's fiscal 2024 ends on 1 February 2025). The offsets were checked
// against the release file: every annual outcome is reported after the year it belongs to ends.
const SUN = 0;
const FRI = 5;
const SAT = 6;

export const FISCAL_YEAR_END = {
  ADBE: { nearest: FRI, date: [11, 30], offset: 0 }, // Friday nearest 30 November
  AMD: { last: SAT, month: 12, offset: 0 }, // last Saturday of December
  AMZN: { date: [12, 31], offset: 0 },
  AVGO: { nearest: SUN, date: [10, 31], offset: 0 }, // Sunday nearest 31 October
  CRM: { date: [1, 31], offset: 0 },
  HD: { nearest: SUN, date: [1, 31], offset: 1 }, // Sunday nearest 31 January
  HON: { date: [12, 31], offset: 0 },
  LOW: { nearest: FRI, date: [1, 31], offset: 1 }, // Friday nearest 31 January
  META: { date: [12, 31], offset: 0 },
  MSFT: { date: [6, 30], offset: 0 },
  NVDA: { last: SUN, month: 1, offset: 0 }, // last Sunday of January
  QCOM: { last: SUN, month: 9, offset: 0 }, // last Sunday of September
  TGT: { nearest: SAT, date: [1, 31], offset: 1 }, // Saturday nearest 31 January
  UNH: { date: [12, 31], offset: 0 },
  WMT: { date: [1, 31], offset: 0 },
};

const DAY = 86400000;
const CALENDAR = { date: [12, 31], offset: 0 };

// The last day of fiscal year `fy` for `ticker`, as a UTC midnight timestamp.
export function fiscalYearLastDay(ticker, fy) {
  const r = FISCAL_YEAR_END[ticker] || CALENDAR;
  const year = fy + r.offset;
  if (r.date && r.nearest == null) return Date.UTC(year, r.date[0] - 1, r.date[1]);
  if (r.last != null) {
    const end = Date.UTC(year, r.month, 0); // last day of the month
    return end - ((new Date(end).getUTCDay() - r.last + 7) % 7) * DAY;
  }
  const target = Date.UTC(year, r.date[0] - 1, r.date[1]);
  let d = (r.nearest - new Date(target).getUTCDay() + 7) % 7; // days forward to that weekday, 0 to 6
  if (d > 3) d -= 7; // nearer going back
  return target + d * DAY;
}

// The instant fiscal year `fy` ends (the start of the day after its last day, UTC).
export function fiscalYearEnd(ticker, fy) {
  return fiscalYearLastDay(ticker, fy) + DAY;
}
