import { FISCAL_YEAR_END } from "./data/fiscal.js";

// The fiscal year end rule of a company, in words, read from the hand-maintained table in data/fiscal.js.
// Null when the ticker has no row there: the page then says nothing rather than assume a calendar year.
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function fiscalYearEndText(ticker) {
  const r = FISCAL_YEAR_END[String(ticker).toUpperCase()];
  if (!r) return null;
  if (r.last != null) return `fiscal year ends on the last ${DAYS[r.last]} of ${MONTHS[r.month - 1]}`;
  const date = `${r.date[1]} ${MONTHS[r.date[0] - 1]}`;
  if (r.nearest != null) return `fiscal year ends on the ${DAYS[r.nearest]} nearest ${date}`;
  return `fiscal year ends ${date}`;
}
