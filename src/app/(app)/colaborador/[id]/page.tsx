"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { processEmployees } from "@/lib/engine";
import { useToast } from "@/components/ToastContext";
import { mockExceptions } from "@/lib/mockData";
import { useEmployees } from "@/lib/useEmployees";
import { useParamsConfig, effectiveGroup } from "@/lib/params";
import { Employee, TimeRecord } from "@/types";
import {
  CalendarClock, ShieldAlert, ShieldCheck, Check, Gauge, Clock, Briefcase,
  X, Sparkles, ChevronLeft, Info
} from "lucide-react";
import { cn, fmtName } from "@/lib/utils";
import EmployeeSearch from "@/components/EmployeeSearch";
import Link from "next/link";


const statusClass: Record<string, string> = {
  Ok: "status-good", "Atraso Entrada": "status-warn", "Atraso Almoço": "status-warn", "Atraso Saída": "status-warn", "Saída Antecipada": "status-warn", Falta: "status-bad",
  Abonado: "status-info", Feriado: "status-neutral", Folga: "status-neutral", "Férias": "status-info"
};

export default function EmployeePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "emp-001";

  // Abonos aplicados ao vivo nesta sessão (recordId -> motivo)
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [modalRec, setModalRec] = useState<string | null>(null);
  const [infoModalRec, setInfoModalRec] = useState<TimeRecord | null>(null);
  const [abonoType, setAbonoType] = useState("Falta Abonada");
  const [justificativa, setJustificativa] = useState("");
  const { toast } = useToast();
  const [cfg] = useParamsConfig();
  const employees = useEmployees();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pc-overrides");
      if (stored) {
        setOverrides(JSON.parse(stored));
      }
    } catch (e) {}

    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem("pc-overrides");
        if (stored) {
          setOverrides(JSON.parse(stored));
        }
      } catch (e) {}
    };

    window.addEventListener("pc-overrides-change", handleStorageChange);
    return () => {
      window.removeEventListener("pc-overrides-change", handleStorageChange);
    };
  }, []);

  const employee: Employee | undefined = useMemo(() => {
    const withOverrides = employees.map((e) => ({
      ...e,
      records: e.records.map((r) => (overrides[r.id] ? { ...r, manualOverride: overrides[r.id] } : r)),
    }));
    const processed = processEmployees(withOverrides, mockExceptions, cfg);
    return processed.find((e) => e.id === id) ?? processed[0];
  }, [id, overrides, cfg, employees]);

  if (!employee) return <div className="text-muted">Colaborador não encontrado.</div>;

  const atrasoTotal = employee.records.filter((r) => r.status.some(s => s.startsWith("Atraso") || s === "Saída Antecipada")).length;
  const abonados = employee.records.filter((r) => r.status.includes("Abonado")).length;

  const summary = [
    { label: "Score de Aderência", value: `${employee.adherenceScore.toFixed(1)}%`, icon: Gauge, tone: "brand" },
    { label: "Dias com atraso", value: atrasoTotal, icon: Clock, tone: "warn" },
    { label: "Abonos aplicados", value: abonados, icon: ShieldCheck, tone: "info" },
    { label: "Cargo", value: employee.role, icon: Briefcase, tone: "neutral", small: true },
  ];

  const toneMap: Record<string, { bg: string; fg: string }> = {
    brand: { bg: "var(--color-brand-50)", fg: "var(--color-brand)" },
    warn: { bg: "var(--color-warn-soft)", fg: "var(--color-warn)" },
    info: { bg: "var(--color-brand-50)", fg: "var(--color-brand-700)" },
    neutral: { bg: "#eef1f6", fg: "var(--color-muted)" },
  };

  function confirmAbono() {
    if (modalRec) {
      setOverrides((o) => {
        let val = abonoType;
        if (abonoType === "Falta Justificada") {
          val = `Falta Justificada: ${justificativa || "Sem justificativa informada"}`;
        }
        const next = { ...o, [modalRec]: val };
        localStorage.setItem("pc-overrides", JSON.stringify(next));
        window.dispatchEvent(new Event("pc-overrides-change"));
        return next;
      });
      toast("Divergência atualizada", { description: "A exceção para este dia foi salva com sucesso." });
    }
    setModalRec(null);
  }

  function generateInfoText(r: TimeRecord) {
    if (r.status.includes('Folga') || r.status.includes('Feriado') || r.status.includes('Férias')) {
      return `Dia não útil (${r.status[0]}).`;
    }
    if (r.status.includes('Abonado')) {
      return "As divergências deste dia foram abonadas manualmente.";
    }
    if (r.status.includes('Falta')) {
      if (!r.checkIn1 && !r.checkOut1 && !r.checkIn2 && !r.checkOut2) return "Falta integral: nenhum registro de ponto efetuado no dia.";
      return "Falta parcial: turnos incompletos ou não registrados resultam em zero de aderência.";
    }
    const infracoes = r.status.filter(s => s.startsWith("Atraso") || s === "Saída Antecipada");
    if (infracoes.length > 0) {
      return `Aderência de ${r.adherencePercentage}% devido às seguintes divergências que estouraram a tolerância: ${infracoes.join(", ")}. A jornada prevista era ${r.expectedSchedule}.`;
    }
    if (r.status.includes('Ok')) {
      if (r.adherencePercentage < 100) {
        return `O colaborador cumpriu a jornada, porém ocorreram escorregões (abaixo da tolerância máxima) que reduziram a aderência para ${r.adherencePercentage}%. A jornada prevista era ${r.expectedSchedule}.`;
      }
      return "O colaborador cumpriu a jornada prevista perfeitamente dentro da tolerância, garantindo 100% de aderência.";
    }
    return "Sem dados adicionais.";
  }

  return (
    <>
      <div className="flex flex-col gap-7 anim-up relative z-0">
        {/* Search Bar no topo */}
      <div className="flex items-center gap-3 w-full max-w-2xl mx-auto">
        <EmployeeSearch className="flex-1" />
        <Link href="/colaborador" className="btn btn-outline flex-none px-3 text-muted-2 hover:text-ink">
          <X className="w-4 h-4" /> Fechar
        </Link>
      </div>

      {/* Cabeçalho */}
      <div className="card p-6 lg:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5"
           style={{ background: "radial-gradient(600px 240px at 90% -40%, var(--color-brand-50), transparent 70%), var(--color-surface)" }}>
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 rounded-2xl grid place-items-center text-white text-xl font-extrabold flex-none shadow-[var(--sh-blue)]"
               style={{ background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))" }}>
            {fmtName(employee.name).split(" ").slice(0, 2).map((w) => w[0]).join("")}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight text-ink truncate">{fmtName(employee.name)}</h1>
            <p className="text-muted text-sm mt-0.5">{employee.role} · {employee.department}</p>
            {(() => {
              const { group, auto } = effectiveGroup(cfg, employee);
              if (!group) return null;
              return (
                <div className="chip mt-2" style={{ color: group.color, background: "color-mix(in srgb, " + group.color + " 12%, transparent)", borderColor: "color-mix(in srgb, " + group.color + " 30%, transparent)" }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: group.color }} />
                  {group.name}{auto ? " · auto" : ""}
                </div>
              );
            })()}
          </div>
        </div>
        {employee.isDisqualified ? (
          <div className="status status-bad text-sm px-3.5 py-2 flex-none">
            <ShieldAlert className="w-4 h-4" /> Desclassificado
          </div>
        ) : (
          <div className="status status-good text-sm px-3.5 py-2 flex-none">
            <ShieldCheck className="w-4 h-4" /> Elegível ao prêmio
          </div>
        )}
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((s) => {
          const Icon = s.icon;
          const t = toneMap[s.tone];
          return (
            <div key={s.label} className="card p-5">
              <div className="w-10 h-10 rounded-xl grid place-items-center mb-3" style={{ background: t.bg, color: t.fg }}>
                <Icon className="w-5 h-5" />
              </div>
              <div className={cn("font-black tracking-tight text-ink", s.small ? "text-sm leading-snug" : "text-2xl")}>{s.value}</div>
              <div className="text-xs text-muted-2 mt-1">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Espelho diário */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2.5">
          <CalendarClock className="w-5 h-5 text-brand" /> Espelho diário
        </h2>
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="pc-table">
              <thead>
                <tr>
                  <th>Data</th><th>Status</th><th>Jornada prevista</th>
                  <th>Ent. 1</th><th>Saí. 1</th><th>Ent. 2</th><th>Saí. 2</th>
                  <th>Aderência</th><th className="text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {employee.records.map((r) => (
                  <tr key={r.id} className={cn(
                    r.status.includes("Falta") && "row-bad",
                    r.status.some(s => s.startsWith("Atraso") || s === "Saída Antecipada") && "row-warn",
                    r.status.includes("Abonado") && "row-info",
                  )}>
                    <td className="whitespace-nowrap cursor-help" title={`Jornada prevista (${r.dayOfWeek}): ${r.expectedSchedule}`}>
                      <span className="font-semibold text-ink border-b border-dashed border-line-2">{r.date.split("-").reverse().join("/")}</span>
                      <span className="text-ink-2 font-bold text-xs ml-2">{r.dayOfWeek}</span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 items-start">
                        {r.status.map(s => <span key={s} className={cn("status", statusClass[s] || "status-neutral")}>{s}</span>)}
                      </div>
                      {r.justification && (
                        <div className="text-[10.5px] text-muted mt-1 max-w-[140px] truncate" title={r.justification}>
                          <Sparkles className="w-3 h-3 inline -mt-0.5 mr-0.5 text-brand" />{r.justification}
                        </div>
                      )}
                    </td>
                    <td className="text-muted whitespace-nowrap text-[12.5px]">{r.expectedSchedule}</td>
                    <td className="tabular-nums">{r.checkIn1 ?? "—"}</td>
                    <td className="tabular-nums">{r.checkOut1 ?? "—"}</td>
                    <td className="tabular-nums">{r.checkIn2 ?? "—"}</td>
                    <td className="tabular-nums">{r.checkOut2 ?? "—"}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-line-2 overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${r.adherencePercentage}%`,
                            background: r.adherencePercentage >= 90 ? "var(--color-good)" : r.adherencePercentage >= 50 ? "var(--color-warn)" : "var(--color-bad)",
                          }} />
                        </div>
                        <span className="text-xs text-muted-2 tabular-nums w-9">{r.adherencePercentage}%</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <button onClick={() => setInfoModalRec(r)} title="Info do dia"
                                className="w-8 h-8 rounded-lg grid place-items-center text-muted hover:bg-brand-50 hover:text-brand transition-colors border border-transparent hover:border-brand-100 flex-none">
                          <Info className="w-4 h-4" />
                        </button>
                        {(r.status.includes("Falta") || r.status.some(s => s.startsWith("Atraso") || s === "Saída Antecipada")) && (
                          <button onClick={() => { setModalRec(r.id); setAbonoType("Falta Abonada"); setJustificativa(""); }} className="btn btn-sm">
                            Abonar
                          </button>
                        )}
                        {r.status.includes("Abonado") && <Check className="w-4 h-4 text-brand ml-auto" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      </div>
      
      {/* Modal de abono (fora do anim-up) */}
      {modalRec && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4" style={{ background: "rgba(15,27,45,0.45)", backdropFilter: "blur(3px)" }}
             onClick={() => setModalRec(null)}>
          <div className="card p-6 w-full max-w-md shadow-[var(--sh-lg)] anim-scale" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-extrabold">Gerenciar Divergência</h3>
              <button onClick={() => setModalRec(null)} className="text-muted-2 hover:text-ink p-1"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted mb-4">Escolha a ação para a divergência no registro de ponto deste dia.</p>
            
            <label className="text-xs font-semibold text-muted-2 uppercase tracking-wide">Ação</label>
            <select value={abonoType} onChange={(e) => setAbonoType(e.target.value)}
                    className="w-full mt-1.5 mb-4 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-sm text-ink outline-none focus:border-brand-500">
              <option value="Falta Abonada">Falta Abonada (Não conta inaderência)</option>
              <option value="Falta Justificada">Falta Justificada (Escrever justificativa)</option>
              <option value="Falta">Falta (Mantém como falta e conta inaderência)</option>
            </select>

            {abonoType === "Falta Justificada" && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-muted-2 uppercase tracking-wide">Justificativa</label>
                <input type="text" value={justificativa} onChange={(e) => setJustificativa(e.target.value)}
                       placeholder="Motivo da falta..."
                       className="field w-full mt-1.5 px-3.5 py-3 text-sm" />
              </div>
            )}

            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setModalRec(null)} className="btn btn-outline">Cancelar</button>
              <button onClick={confirmAbono} className="btn"><Check className="w-4 h-4" /> Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Info (fora do anim-up) */}
      {infoModalRec && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4" style={{ background: "rgba(15,27,45,0.45)", backdropFilter: "blur(3px)" }}
             onClick={() => setInfoModalRec(null)}>
          <div className="card p-6 w-full max-w-sm shadow-[var(--sh-lg)] anim-scale text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-brand-50 text-brand grid place-items-center mx-auto mb-4 shadow-[var(--sh-xs)]">
              <Info className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-ink mb-1">Desempenho Diário</h3>
            <p className="text-sm text-muted mb-4 font-bold">{infoModalRec.date.split("-").reverse().join("/")} — {infoModalRec.dayOfWeek}</p>
            <div className="bg-surface-2 border border-line rounded-xl p-4 text-sm text-ink-2 leading-relaxed mb-6 font-medium">
              {generateInfoText(infoModalRec)}
            </div>
            <button onClick={() => setInfoModalRec(null)} className="btn w-full">Entendido</button>
          </div>
        </div>
      )}
    </>
  );
}
