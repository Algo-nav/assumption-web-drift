// Two letters for a company whose logo is not shown: the first two letters of its ticker ("BRK.B" gives "BR").
export function monogram(ticker) {
  return String(ticker).replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
}
