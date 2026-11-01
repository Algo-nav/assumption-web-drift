"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function periodKey(p) {
  const m = /^(?:Q([1-4]) )?FY(\d{4})$/.exec(p);
  return m ? Number(m[2]) * 10 + (m[1] ? Number(m[1]) : 5) : 0;
}

export default function ComparePicker({ index, initial }) {
  const router = useRouter();
  const tickers = Object.keys(index).sort((a, b) => index[a].name.localeCompare(index[b].name));
  const [t, setT] = useState(initial.t && index[initial.t] ? initial.t : tickers[0]);
  const metrics = Object.keys(index[t].metrics).sort();
  const [m, setM] = useState(initial.m && index[t].metrics[initial.m] ? initial.m : metrics[0]);
  const periods = Object.keys(index[t].metrics[m]).sort((a, b) => periodKey(a) - periodKey(b));
  const [a, setA] = useState(periods.includes(initial.a) ? initial.a : periods[0]);
  const [b, setB] = useState(periods.includes(initial.b) ? initial.b : periods[Math.min(1, periods.length - 1)]);
  const [ai, setAi] = useState(initial.ai || 0);
  const [bi, setBi] = useState(initial.bi || 0);

  function changeCompany(next) {
    const ms = Object.keys(index[next].metrics).sort();
    setT(next);
    changeMetric(next, ms[0]);
  }
  function changeMetric(nextT, nextM) {
    const ps = Object.keys(index[nextT].metrics[nextM]).sort((x, y) => periodKey(x) - periodKey(y));
    setM(nextM);
    setA(ps[0]);
    setB(ps[Math.min(1, ps.length - 1)]);
    setAi(0);
    setBi(0);
  }

  const listA = index[t].metrics[m][a] || [];
  const listB = index[t].metrics[m][b] || [];

  function onSubmit(e) {
    e.preventDefault();
    const q = new URLSearchParams({ t, m, a, b });
    if (ai) q.set("ai", String(ai));
    if (bi) q.set("bi", String(bi));
    router.push(`/compare?${q.toString()}`);
  }

  const stmt = (list, value, set, id) =>
    list.length > 1 ? (
      <select id={id} className="input" value={value} onChange={(e) => set(Number(e.target.value))} style={{ marginTop: "var(--s1)" }} aria-label="Statement">
        {list.map((s, i) => (
          <option key={s.id} value={i}>stated {s.statedAt}</option>
        ))}
      </select>
    ) : null;

  return (
    <form onSubmit={onSubmit}>
      <div className="fields fields-2">
        <div>
          <label className="label" htmlFor="cmp-company">Company</label>
          <select id="cmp-company" className="input" value={t} onChange={(e) => changeCompany(e.target.value)}>
            {tickers.map((k) => (
              <option key={k} value={k}>{index[k].name} ({k})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cmp-metric">Metric</label>
          <select id="cmp-metric" className="input" value={m} onChange={(e) => changeMetric(t, e.target.value)}>
            {metrics.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cmp-a">First period</label>
          <select id="cmp-a" className="input" value={a} onChange={(e) => { setA(e.target.value); setAi(0); }}>
            {periods.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {stmt(listA, ai, setAi, "cmp-ai")}
        </div>
        <div>
          <label className="label" htmlFor="cmp-b">Second period</label>
          <select id="cmp-b" className="input" value={b} onChange={(e) => { setB(e.target.value); setBi(0); }}>
            {periods.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {stmt(listB, bi, setBi, "cmp-bi")}
        </div>
      </div>
      <div style={{ marginTop: "var(--s2)" }}>
        <button type="submit" className="btn btn-cta">Compare</button>
      </div>
    </form>
  );
}
