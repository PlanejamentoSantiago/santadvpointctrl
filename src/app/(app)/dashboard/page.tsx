"use client";

import { processEmployees } from "@/lib/engine";
import { mockExceptions } from "@/lib/mockData";
import { useEmployees } from "@/lib/useEmployees";
import { useTheme } from "@/lib/useTheme";
import { useParamsConfig } from "@/lib/params";
import Link from "next/link";
import { fmtName } from "@/lib/utils";
import {
  Users, CheckCircle2, Trophy, AlertTriangle, BarChart3, ArrowUpRight, TrendingUp,
  CalendarDays, Building2, Inbox, Percent
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid,
  AreaChart, Area,
} from "recharts";


const WEEK = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];
const WEEK_FULL: Record<string, string> = { SEG: "Segunda", TER: "Terça", QUA: "Quarta", QUI: "Quinta", SEX: "Sexta", SAB: "Sábado", DOM: "Domingo" };

export default function Dashboard() {
  const { theme } = useTheme();
  const [params] = useParamsConfig();
  const employees = useEmployees();
  const processed = processEmployees(employees, mockExceptions, params);

  if (employees.length === 0) {
    return (
      <div className="flex flex-col gap-7 anim-up h-[70vh] items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-brand-50 text-brand flex items-center justify-center shadow-sm">
          <Inbox className="w-10 h-10" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink mb-2">Nenhum dado importado</h2>
          <p className="text-muted text-sm mb-6">
            O PointControl precisa do relatório de batidas para calcular a aderência, faltas e o ranking de premiação.
          </p>
          <Link href="/upload" className="btn inline-flex items-center gap-2">
            Fazer ingestão de dados agora
          </Link>
        </div>
      </div>
    );
  }

  const total = processed.length;
  const elegible = processed.filter((e) => !e.isDisqualified).length;
  const disqualified = total - elegible;
  const avg = processed.reduce((a, e) => a + e.adherenceScore, 0) / (total || 1);

  const chartData = processed
    .map((e) => ({ name: fmtName(e.name), score: e.adherenceScore, disq: e.isDisqualified }))
    .sort((a, b) => b.score - a.score);

  const critical = processed.filter((e) => e.isDisqualified);

  // Assiduidade por dia da semana
  const wk: Record<string, { sum: number; n: number }> = {};
  processed.forEach((e) => e.records.forEach((r) => {
    if (r.status.includes("Feriado") || r.status.includes("Folga") || r.status.includes("Férias")) return;
    (wk[r.dayOfWeek] ||= { sum: 0, n: 0 });
    wk[r.dayOfWeek].sum += r.adherencePercentage;
    wk[r.dayOfWeek].n += 1;
  }));
  const weekdayData = WEEK.filter((d) => wk[d]).map((d) => ({ day: d, score: Math.round(wk[d].sum / wk[d].n) }));

  // Top departamentos
  const dep: Record<string, { sum: number; n: number }> = {};
  processed.forEach((e) => { (dep[e.department] ||= { sum: 0, n: 0 }); dep[e.department].sum += e.adherenceScore; dep[e.department].n += 1; });
  const deptData = Object.entries(dep)
    .map(([name, v]) => ({ name, score: +(v.sum / v.n).toFixed(1), n: v.n }))
    .sort((a, b) => b.score - a.score);

  // Paleta dos gráficos conforme o tema
  const grid = theme === "dark" ? "#22304a" : "#eef2f8";
  const axis = theme === "dark" ? "#2a3852" : "#e6ebf2";
  const tickC = theme === "dark" ? "#93a1bd" : "#64748b";
  const tick2 = theme === "dark" ? "#6c7b9a" : "#94a3b8";
  const tip = {
    borderRadius: 12, border: `1px solid ${theme === "dark" ? "#24314a" : "#e6ebf2"}`,
    boxShadow: "var(--sh)", fontSize: 13, background: theme === "dark" ? "#172236" : "#fff",
    color: theme === "dark" ? "#e8eefb" : "#0f1b2d",
  };

  const kpis = [
    { label: "Colaboradores", value: total, sub: "processados no período", icon: Users, tone: "brand" },
    { label: "Aderência média", value: `${avg.toFixed(1)}%`, sub: "precisão global do ponto", icon: Percent, tone: "neutral", highlight: true },
    { label: "Aderentes", value: elegible, sub: "com histórico positivo", icon: CheckCircle2, tone: "good" },
    { label: "Inaderentes", value: disqualified, sub: "com faltas ou infrações", icon: AlertTriangle, tone: "bad" },
  ];
  const tone: Record<string, { bg: string; fg: string }> = {
    brand: { bg: "var(--color-brand-50)", fg: "var(--color-brand)" },
    good: { bg: "var(--color-good-soft)", fg: "var(--color-good)" },
    gold: { bg: "var(--color-gold-soft)", fg: "#a9862f" },
    bad: { bg: "var(--color-bad-soft)", fg: "var(--color-bad)" },
    neutral: { bg: "var(--color-surface-3)", fg: "var(--color-ink)" },
  };

  return (
    <div className="flex flex-col gap-7 anim-up">
      <header>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-ink">Painel de Aderência</h1>
        <p className="text-muted mt-1">Visão estratégica do ponto e engajamento corporativo.</p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          const t = tone[k.tone];
          return (
            <div key={k.label} className="card card-hover kpi p-5"
                 style={k.highlight ? { borderColor: `color-mix(in srgb, ${t.fg} 30%, transparent)` } : undefined}>
              <div className="k-ic mb-3" style={{ background: t.bg, color: t.fg }}>
                <Icon className="w-[22px] h-[22px]" />
              </div>
              <div className="text-3xl lg:text-[34px] font-black tracking-tighter text-ink leading-none">{k.value}</div>
              <div className="text-sm font-semibold text-ink-2 mt-2">{k.label}</div>
              <div className="text-xs text-muted-2 mt-0.5">{k.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Aderência por colaborador + Divergências */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-brand" /> Aderência por colaborador
            </h3>
            <span className="chip"><TrendingUp className="w-3.5 h-3.5" /> {avg.toFixed(1)}% média</span>
          </div>
          <div className="h-[300px] -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: tickC, fontSize: 12 }} tickLine={false} axisLine={{ stroke: axis }} />
                <YAxis domain={[0, 100]} tick={{ fill: tick2, fontSize: 12 }} tickLine={false} axisLine={false} unit="%" width={44} />
                <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} contentStyle={tip} formatter={(v) => [`${v}%`, "Aderência"]} />
                <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={64}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.disq ? "#e0564f" : d.score >= 95 ? "#2563eb" : "#60a5fa"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6 flex flex-col">
          <h3 className="font-bold text-lg flex items-center gap-2.5 mb-5">
            <AlertTriangle className="w-5 h-5 text-bad" /> Divergências críticas
          </h3>
          <div className="flex flex-col gap-3 flex-1">
            {critical.length === 0 && (
              <div className="flex-1 grid place-items-center text-center text-muted text-sm py-8">Nenhuma divergência crítica 🎉</div>
            )}
            {critical.map((emp) => (
              <Link key={emp.id} href={`/colaborador/${emp.id}`}
                    className="group rounded-xl border p-4 flex items-start gap-3 transition-colors"
                    style={{ background: "var(--color-bad-soft)", borderColor: "color-mix(in srgb, var(--color-bad) 30%, transparent)" }}>
                <div className="w-9 h-9 rounded-lg grid place-items-center flex-none"
                     style={{ background: "var(--color-surface)", color: "var(--color-bad)", border: "1px solid color-mix(in srgb, var(--color-bad) 30%, transparent)" }}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-ink text-sm flex items-center gap-1">
                    {fmtName(emp.name)}
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-xs text-muted">{emp.department}</div>
                  <div className="text-[11.5px] font-semibold text-bad mt-1.5">{emp.disqualificationReason}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Assiduidade por dia da semana + Top departamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <h3 className="font-bold text-lg flex items-center gap-2.5 mb-5">
            <CalendarDays className="w-5 h-5 text-brand" /> Assiduidade por dia da semana
          </h3>
          <div className="h-[240px] -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekdayData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="wkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: tickC, fontSize: 12 }} tickLine={false} axisLine={{ stroke: axis }} />
                <YAxis domain={[0, 100]} tick={{ fill: tick2, fontSize: 12 }} tickLine={false} axisLine={false} unit="%" width={44} />
                <Tooltip contentStyle={tip}
                  labelFormatter={(l) => WEEK_FULL[l as string] ?? l}
                  formatter={(v) => [`${v}%`, "Aderência"]} />
                <Area type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2.5} fill="url(#wkFill)" dot={{ r: 3, fill: "#2563eb" }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-lg flex items-center gap-2.5 mb-5">
            <Building2 className="w-5 h-5 text-brand" /> Top departamentos pontuais
          </h3>
          <div className="flex flex-col gap-3.5">
            {deptData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-md grid place-items-center text-[11px] font-bold flex-none tabular-nums"
                      style={{ background: i === 0 ? "var(--color-gold-soft)" : "var(--color-surface-2)", color: i === 0 ? "#a9862f" : "var(--color-muted)", border: "1px solid var(--color-line)" }}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-ink truncate">{d.name}</span>
                    <span className="text-sm font-bold text-ink tabular-nums ml-2">{d.score}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-line-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: "linear-gradient(90deg, var(--color-brand-400), var(--color-brand))" }} />
                  </div>
                  <div className="text-[11px] text-muted-2 mt-1">{d.n} colaborador{d.n > 1 ? "es" : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
