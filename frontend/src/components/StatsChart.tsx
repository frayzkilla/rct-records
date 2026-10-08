import { useEffect, useId, useRef, useState } from "react";
import { dateTime, number } from "../lib/stats";

type Line = { label: string; color: string; values: number[] };

export default function StatsChart({ title, dates, lines, startedAt }: { title: string; dates: string[]; lines: Line[]; startedAt: string }) {
  const id = useId().replace(/:/g, "");
  const chartRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(740);
  const [active, setActive] = useState<number | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const visible = lines.filter((line) => !hidden.includes(line.label));
  const maximum = Math.max(4, ...visible.flatMap((line) => line.values));
  const ceiling = Math.ceil(maximum / 4) * 4;
  const plotWidth = width - 80;
  const x = (index: number) => 48 + index / Math.max(1, dates.length - 1) * plotWidth;
  const y = (value: number) => 192 - value / ceiling * 154;
  const start = new Date(startedAt).getTime();
  const interval = dates.length > 1 ? new Date(dates[1]).getTime() - new Date(dates[0]).getTime() : 3600000;
  const valid = (index: number) => new Date(dates[index]).getTime() + interval > start;
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    if (chartRef.current) observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={chartRef} className="stats-chart" role="group" aria-label={title}>
    <div className="stats-chart-legend">
      {lines.map((line) => <button key={line.label} type="button" aria-pressed={!hidden.includes(line.label)} onClick={() => setHidden((current) => current.includes(line.label) ? current.filter((item) => item !== line.label) : [...current, line.label])} style={{ opacity: hidden.includes(line.label) ? 0.4 : 1 }}><span style={{ background: line.color }} />{line.label}</button>)}
    </div>
    <svg viewBox={`0 0 ${width} 232`} role="img" aria-label={title} onPointerLeave={(event) => { if (event.pointerType === "mouse") setActive(null); }}>
      <defs>{lines.map((line, index) => <linearGradient key={line.label} id={`${id}-${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={line.color} stopOpacity="0.19" /><stop offset="100%" stopColor={line.color} stopOpacity="0" /></linearGradient>)}</defs>
      {[0, 1, 2, 3, 4].map((index) => <g key={index}><line x1="48" x2={width - 32} y1={y(ceiling / 4 * index)} y2={y(ceiling / 4 * index)} className="stats-gridline" /><text x="35" y={y(ceiling / 4 * index) + 4} textAnchor="end">{number(ceiling / 4 * index)}</text></g>)}
      {visible.map((line) => {
        const points = line.values.map((value, index) => ({ value, index })).filter(({ index }) => valid(index));
        if (!points.length) return null;
        const path = points.map(({ value, index }, i) => `${i ? "L" : "M"}${x(index)},${y(value)}`).join(" ");
        return <g key={line.label}><path d={`${path} L${x(points[points.length - 1].index)},192 L${x(points[0].index)},192 Z`} fill={`url(#${id}-${lines.indexOf(line)})`} /><path d={path} stroke={line.color} strokeWidth="2.4" fill="none" strokeLinejoin="round" />{points.length === 1 && <circle cx={x(points[0].index)} cy={y(points[0].value)} r="3" fill={line.color} />}</g>;
      })}
      {dates.map((date, index) => <rect key={date} x={x(index) - plotWidth / 2 / Math.max(1, dates.length - 1)} y="28" width={plotWidth / Math.max(1, dates.length - 1)} height="170" fill="transparent" onPointerEnter={() => setActive(index)} onClick={() => setActive(index)}><title>{dateTime(date)}: {valid(index) ? lines.map((line) => `${line.label}: ${number(line.values[index])}`).join(", ") : "Сбор ещё не начат"}</title></rect>)}
      {[0, Math.floor((dates.length - 1) / 2), dates.length - 1].filter((value, index, values) => values.indexOf(value) === index).map((index) => <text key={index} x={x(index)} y="221" textAnchor={index === 0 ? "start" : index === dates.length - 1 ? "end" : "middle"}>{dateTime(dates[index])}</text>)}
      {active !== null && <g pointerEvents="none"><line x1={x(active)} x2={x(active)} y1="28" y2="192" stroke="#8c8881" strokeDasharray="4 4" />{valid(active) && visible.map((line) => <circle key={line.label} cx={x(active)} cy={y(line.values[active])} r="4" fill={line.color} stroke="#161616" strokeWidth="2" />)}</g>}
    </svg>
    <div className="stats-chart-readout" aria-live="polite">{active !== null ? <><span>{dateTime(dates[active])}</span>{valid(active) ? visible.map((line) => <span key={line.label} style={{ color: line.color }}>{line.label}: <strong>{number(line.values[active])}</strong></span>) : <span>Сбор ещё не начат</span>}</> : <span>Наведите или коснитесь графика · UTC+8</span>}</div>
    <details className="stats-chart-data"><summary>Данные графика</summary><div><table><thead><tr><th>Период</th>{lines.map((line) => <th key={line.label}>{line.label}</th>)}</tr></thead><tbody>{dates.map((date, index) => <tr key={date}><td>{dateTime(date)}</td>{lines.map((line) => <td key={line.label}>{valid(index) ? number(line.values[index]) : "Нет данных"}</td>)}</tr>)}</tbody></table></div></details>
  </div>;
}
