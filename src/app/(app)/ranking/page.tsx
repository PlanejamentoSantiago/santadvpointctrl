"use client";

import { useState } from "react";
import { processEmployees, getTopRanking } from "@/lib/engine";
import { mockExceptions } from "@/lib/mockData";
import { useEmployees } from "@/lib/useEmployees";
import { useParamsConfig } from "@/lib/params";
import { Trophy, Medal, Award, Ban, Crown, ArrowRight, ArrowLeft, CalendarDays, X, Download, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { fmtName, initials } from "@/lib/utils";

export default function RankingPage() {
  const [params] = useParamsConfig();
  const employees = useEmployees();
  const processed = processEmployees(employees, mockExceptions, params);
  const top = getTopRanking(processed);
  const eligible = processed.filter((e) => !e.isDisqualified).sort((a, b) => b.adherenceScore - a.adherenceScore);
  const disqualified = processed.filter((e) => e.isDisqualified);
  const [showFullRanking, setShowFullRanking] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [exportMenu, setExportMenu] = useState(false);

  // Calcula a aderência por dia
  const dateAdherence: Record<string, { total: number; count: number }> = {};
  processed.forEach(emp => {
    emp.records.forEach(r => {
      if (!r.status.includes("Feriado") && !r.status.includes("Folga") && !r.status.includes("Férias") && r.dayOfWeek !== "SAB" && r.dayOfWeek !== "DOM") {
        if (!dateAdherence[r.date]) dateAdherence[r.date] = { total: 0, count: 0 };
        dateAdherence[r.date].total += r.adherencePercentage;
        dateAdherence[r.date].count += 1;
      }
    });
  });

  const bestDays = Object.entries(dateAdherence)
    .map(([date, data]) => ({ date, avg: data.total / data.count }))
    .sort((a, b) => b.avg - a.avg || a.date.localeCompare(b.date))
    .slice(0, 7); // top 7 dias

  // Ordem visual do pódio: 2º, 1º, 3º
  const podium = [
    { emp: top[1], place: 2, h: "h-40", ring: "var(--color-slate-400)", soft: "var(--color-slate-100)", icon: Medal, delay: 0.15 },
    { emp: top[0], place: 1, h: "h-52", ring: "var(--color-gold)", soft: "var(--color-gold-soft)", icon: Crown, delay: 0 },
    { emp: top[2], place: 3, h: "h-32", ring: "var(--color-orange-600)", soft: "var(--color-orange-100)", icon: Award, delay: 0.3 },
  ];

  const exportToCsv = () => {
    const header = "Nome;Departamento;Cargo;Aderência (%)";
    const rows = processed.map(e => 
      `"${e.name}";"${e.department}";"${e.role}";"${e.adherenceScore}"`
    );
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PointControl_Relatorio_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportMenu(false);
  };

  const exportToPdf = () => {
    setExportMenu(false);
    setTimeout(() => window.print(), 100);
  };

  if (employees.length === 0) {
    return (
      <div className="flex flex-col gap-7 anim-up h-[70vh] items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-brand-50 text-brand flex items-center justify-center shadow-sm">
          <Trophy className="w-10 h-10" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink mb-2">Ranking Indisponível</h2>
          <p className="text-muted text-sm mb-6">
            Não há dados suficientes para gerar o ranking de assiduidade. Por favor, importe o relatório de batidas do mês.
          </p>
          <Link href="/upload" className="btn inline-flex items-center gap-2">
            Fazer ingestão de dados agora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 anim-up">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="chip mb-3"><Trophy className="w-3.5 h-3.5" /> Gamificação</div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-ink">
            {!showFullRanking ? "Top 3 Colaboradores" : "Ranking Completo"}
          </h1>
          <p className="text-muted mt-1">
            {!showFullRanking 
              ? "Pódio com o maior índice de aderência à jornada."
              : "A lista completa de todos os colaboradores elegíveis no momento."}
          </p>
        </div>
        <div className="relative self-start sm:mt-0 print:hidden">
          <button onClick={() => setExportMenu(!exportMenu)} className="btn btn-outline">
            <Download className="w-4 h-4" /> Exportar <ChevronDown className="w-3.5 h-3.5 ml-1" />
          </button>
          
          <AnimatePresence>
            {exportMenu && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-surface border border-line rounded-xl shadow-[var(--sh-lg)] z-50 overflow-hidden">
                <button onClick={exportToCsv} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-ink hover:bg-surface-2 transition-colors border-b border-line">
                  <FileSpreadsheet className="w-4 h-4 text-good" /> Excel (CSV)
                </button>
                <button onClick={exportToPdf} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-ink hover:bg-surface-2 transition-colors">
                  <FileText className="w-4 h-4 text-brand" /> Documento (PDF)
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Pódio ou Lista Completa */}
      <div className="card p-6 lg:p-10 relative overflow-hidden min-h-[420px]"
           style={{ background: "radial-gradient(700px 300px at 50% -30%, var(--color-brand-50), transparent 70%), var(--color-surface)" }}>
        <AnimatePresence mode="wait">
          {!showFullRanking ? (
            <motion.div key="podium"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-end justify-center gap-3 sm:gap-6">
                {podium.map((p) =>
              p.emp ? (
                <motion.div key={p.place}
                  initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: p.delay, type: "spring", stiffness: 120, damping: 16 }}
                  className="flex flex-col items-center flex-1 max-w-[190px]">
                  <div className="relative mb-3">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full grid place-items-center font-extrabold text-white text-xl shadow-[var(--sh)]"
                         style={{ background: p.place === 1 ? "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))" : "linear-gradient(135deg,#94a3b8,#64748b)" }}>
                      {initials(p.emp.name)}
                    </div>
                    <div className="absolute -top-2 -right-1 w-8 h-8 rounded-full grid place-items-center text-white shadow-md"
                         style={{ background: p.ring }}>
                      <p.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-center mb-3">
                    <div className="font-bold text-ink text-sm leading-tight">{fmtName(p.emp.name)}</div>
                    <div className="text-xs text-muted">{p.emp.department}</div>
                    <div className="text-lg font-black text-brand mt-1 tabular-nums">{p.emp.adherenceScore.toFixed(1)}%</div>
                  </div>
                  <div className={`w-full ${p.h} rounded-t-2xl relative grid place-items-start justify-center pt-3 border-t-2`}
                       style={{ background: `linear-gradient(180deg, ${p.soft}, transparent)`, borderColor: p.ring }}>
                    <span className="text-3xl font-black" style={{ color: p.ring }}>{p.place}º</span>
                  </div>
                </motion.div>
              ) : (
                <div key={p.place} className="flex flex-col items-center flex-1 max-w-[190px] opacity-40 grayscale">
                  <div className="relative mb-3">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full grid place-items-center bg-surface-2 border-2 border-dashed border-line">
                      <span className="text-muted font-bold text-xl">?</span>
                    </div>
                  </div>
                  <div className="text-center mb-3">
                    <div className="font-bold text-muted text-sm leading-tight">—</div>
                    <div className="text-xs text-muted-2">Aguardando dados</div>
                    <div className="text-lg font-black text-muted-2 mt-1">-%</div>
                  </div>
                  <div className={`w-full ${p.h} rounded-t-2xl relative grid place-items-start justify-center pt-3 border-t-2`}
                       style={{ background: `linear-gradient(180deg, var(--color-surface-2), transparent)`, borderColor: 'var(--color-line)' }}>
                    <span className="text-3xl font-black text-muted-2">{p.place}º</span>
                  </div>
                </div>
              )
            )}
              </div>
              <button onClick={() => setShowFullRanking(true)} className="absolute bottom-4 right-4 btn btn-sm btn-ghost gap-2 text-brand">
                Ver ranking completo <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div key="list"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-ink">Ranking Completo</h2>
                <button onClick={() => setShowFullRanking(false)} className="btn btn-sm btn-ghost gap-2 text-muted">
                  <ArrowLeft className="w-4 h-4" /> Voltar ao pódio
                </button>
              </div>
              {eligible.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-surface-2 grid place-items-center mb-3">
                    <Trophy className="w-6 h-6 text-muted-2" />
                  </div>
                  <div className="font-semibold text-ink">Nenhum dado no ranking</div>
                  <div className="text-sm text-muted mt-1 max-w-sm">
                    Quando os colaboradores registrarem aderência e não estiverem desclassificados, eles aparecerão aqui.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-2 pb-2">
                  {eligible.map((emp, i) => (
                    <Link href={`/colaborador/${emp.id}`} key={emp.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 hover:bg-brand-50 transition-colors bg-surface">
                      <span className="w-7 h-7 rounded-lg grid place-items-center text-xs font-bold flex-none bg-surface-2 text-muted border border-line tabular-nums">{i + 1}</span>
                      <div className="w-9 h-9 rounded-lg grid place-items-center text-xs font-bold text-brand bg-brand-50 flex-none">{initials(emp.name)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-ink truncate">{fmtName(emp.name)}</div>
                        <div className="text-xs text-muted-2 truncate">{emp.department}</div>
                      </div>
                      <div className="flex-none font-black text-ink tabular-nums text-sm">{emp.adherenceScore.toFixed(1)}%</div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Melhores Dias */}
        <div className="card p-6">
          <h3 className="font-bold text-lg flex items-center gap-2.5 mb-4">
            <CalendarDays className="w-5 h-5 text-brand" /> Dias de Maior Aderência
          </h3>
          <p className="text-xs text-muted mb-4">Top dias com os melhores índices gerais de aderência na empresa.</p>
          <div className="flex flex-col gap-2">
            {bestDays.length === 0 && <div className="text-sm text-muted py-6 text-center">Nenhum dado disponível.</div>}
            {bestDays.map((d, i) => (
              <button key={d.date} onClick={() => setSelectedDay(d.date)} className="w-full cursor-pointer text-left flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 bg-surface-2 hover:bg-surface-3 hover:border-brand-200 hover:shadow-md hover:-translate-y-0.5 transition-all group">
                <span className="w-7 h-7 rounded-lg grid place-items-center text-xs font-bold flex-none bg-surface text-muted border border-line tabular-nums group-hover:text-brand group-hover:border-brand-200 transition-colors">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-ink">{d.date.split("-").reverse().join("/")}</div>
                </div>
                <div className="flex-none w-28">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-muted-2">média</span>
                    <span className="font-bold text-ink tabular-nums">{d.avg.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-line-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${d.avg}%`, background: "linear-gradient(90deg, var(--color-brand-400), var(--color-brand))" }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Desclassificados -> Inaderentes */}
        <div className="card p-6">
          <h3 className="font-bold text-lg flex items-center gap-2.5 mb-4 text-bad">
            <Ban className="w-5 h-5" /> Inaderentes
          </h3>
          <p className="text-xs text-muted mb-4">Colaboradores com faltas que impactam severamente a aderência.</p>
          <div className="flex flex-col gap-2.5">
            {disqualified.length === 0 && <div className="text-sm text-muted py-6 text-center">Nenhum inaderente.</div>}
            {disqualified.map((emp) => (
              <Link href={`/colaborador/${emp.id}`} key={emp.id} className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 border border-line hover:bg-bad-soft transition-colors"
                   style={{ background: "var(--color-surface-2)" }}>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-ink truncate">{fmtName(emp.name)}</div>
                  <div className="text-xs text-muted-2">{emp.department}</div>
                </div>
                <span className="status status-bad flex-none">{emp.disqualificationReason}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Dia */}
      <AnimatePresence>
        {selectedDay && (
          <div className="fixed inset-0 z-[100] grid place-items-center p-4" style={{ background: "rgba(15,27,45,0.45)", backdropFilter: "blur(3px)" }}
               onClick={() => setSelectedDay(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="card w-full max-w-5xl max-h-[85vh] flex flex-col shadow-[var(--sh-lg)]"
                        onClick={(e) => e.stopPropagation()}>
              <div className="p-5 lg:p-6 border-b border-line flex items-center justify-between flex-none bg-surface-2 rounded-t-2xl">
                <div>
                  <h3 className="text-xl font-extrabold text-ink mb-1 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-brand" /> 
                    Detalhes do Dia: {selectedDay.split("-").reverse().join("/")}
                  </h3>
                  <p className="text-sm text-muted">Aderência de todos os colaboradores neste dia específico.</p>
                </div>
                <button onClick={() => setSelectedDay(null)} className="w-8 h-8 rounded-lg grid place-items-center text-muted-2 hover:bg-line hover:text-ink transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-0 bg-surface rounded-b-2xl">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="sticky top-0 z-10 bg-surface-2">
                      <tr className="text-[11px] uppercase tracking-wider text-muted-2 font-semibold">
                        <th className="py-3 px-4 border-b border-line">Colaborador</th>
                        <th className="py-3 px-4 border-b border-line">Status</th>
                        <th className="py-3 px-4 border-b border-line">Previsto</th>
                        <th className="py-3 px-4 border-b border-line">Ent. 1</th>
                        <th className="py-3 px-4 border-b border-line">Saí. 1</th>
                        <th className="py-3 px-4 border-b border-line">Ent. 2</th>
                        <th className="py-3 px-4 border-b border-line">Saí. 2</th>
                        <th className="py-3 px-4 border-b border-line text-right">Aderência</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {processed
                        .map(emp => ({ emp, r: emp.records.find(rec => rec.date === selectedDay) }))
                        .filter(item => item.r) // Apenas os que tem ponto neste dia
                        .sort((a, b) => b.r!.adherencePercentage - a.r!.adherencePercentage) // Ordena por aderência (melhores primeiro)
                        .map(({ emp, r }) => (
                        <tr key={emp.id} className="border-b border-line hover:bg-surface-2 transition-colors">
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-ink text-[13px]">{fmtName(emp.name)}</div>
                            <div className="text-[11px] text-muted">{emp.department}</div>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              {r!.status.map(s => {
                                let style = "status-neutral";
                                if (s === "Ok" || s === "Presente") style = "status-good";
                                else if (s.includes("Atraso") || s.includes("Antecipada")) style = "status-warn";
                                else if (s.includes("Falta")) style = "status-bad";
                                else if (s.includes("Abonado") || s.includes("Férias")) style = "status-info";
                                return <span key={s} className={`status text-[10px] px-2 py-0.5 ${style}`}>{s}</span>;
                              })}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-muted text-[12.5px] whitespace-nowrap">{r!.expectedSchedule}</td>
                          <td className="py-2.5 px-4 tabular-nums text-ink-2">{r!.checkIn1 ?? "—"}</td>
                          <td className="py-2.5 px-4 tabular-nums text-ink-2">{r!.checkOut1 ?? "—"}</td>
                          <td className="py-2.5 px-4 tabular-nums text-ink-2">{r!.checkIn2 ?? "—"}</td>
                          <td className="py-2.5 px-4 tabular-nums text-ink-2">{r!.checkOut2 ?? "—"}</td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-line-2 overflow-hidden flex-none">
                                <div className="h-full rounded-full" style={{ width: `${r!.adherencePercentage}%`, background: r!.adherencePercentage >= 90 ? "var(--color-good)" : r!.adherencePercentage >= 50 ? "var(--color-warn)" : "var(--color-bad)" }} />
                              </div>
                              <span className="text-[11.5px] font-bold text-ink tabular-nums w-8 text-right">{r!.adherencePercentage}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
