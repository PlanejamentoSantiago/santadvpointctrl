"use client";

import {
  useParamsConfig, DEFAULT_PARAMS, WorkGroup, WEEKDAYS, WEEKDAY_FULL, GROUP_COLORS,
  effectiveGroup, Weekday,
} from "@/lib/params";
import { useEmployees } from "@/lib/useEmployees";
import Stepper from "@/components/Stepper";
import {
  SlidersHorizontal, Clock, Info, RotateCcw, Users2, Plus, Trash2, CheckCircle2,
  Pencil, Check,
} from "lucide-react";
import { fmtName, initials } from "@/lib/utils";
import { useToast } from "@/components/ToastContext";


import { useState } from "react";

export default function ParametrosPage() {
  const [cfg, update] = useParamsConfig();
  const [editingId, setEditingId] = useState<string | null>(null);
  const employees = useEmployees();
  const { toast } = useToast();
  const gTol = cfg.global.toleranceMinutes;

  const setGlobalTol = (v: number) => update({ ...cfg, global: { ...cfg.global, toleranceMinutes: v } });

  const setGroup = (id: string, patch: Partial<WorkGroup>) =>
    update({ ...cfg, groups: cfg.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) });

  const setGroupDay = (id: string, day: Weekday, val: string) =>
    update({
      ...cfg,
      groups: cfg.groups.map((g) =>
        g.id === id ? { ...g, scheduleByDay: { ...g.scheduleByDay, [day]: val.trim() ? val : null } } : g,
      ),
    });

  const addGroup = () => {
    const color = GROUP_COLORS[cfg.groups.length % GROUP_COLORS.length];
    const base = "08:00-12:00 13:00-18:00";
    const ng: WorkGroup = {
      id: `g-${Date.now()}`, name: "Novo grupo", color, toleranceMinutes: gTol, departureEarlyGrace: 0,
      scheduleByDay: { SEG: base, TER: base, QUA: base, QUI: base, SEX: base, SAB: null, DOM: null },
    };
    update({ ...cfg, groups: [...cfg.groups, ng] });
    setEditingId(ng.id);
    toast("Grupo criado", { description: "Novo grupo de jornada adicionado." });
  };

  const removeGroup = (id: string) => {
    update({
      ...cfg,
      groups: cfg.groups.filter((g) => g.id !== id),
      employeeGroup: Object.fromEntries(Object.entries(cfg.employeeGroup).filter(([, v]) => v !== id)),
    });
    toast("Grupo removido", { description: "O grupo foi excluído permanentemente." });
  };

  const setEmpGroup = (empId: string, groupId: string) => {
    const next = { ...cfg.employeeGroup };
    if (!groupId) delete next[empId];
    else next[empId] = groupId;
    update({ ...cfg, employeeGroup: next });
  };

  const example = (tol: number) =>
    [0, 1, 2].map((m) => (m === 0 ? "08:00 = 100%" : m >= tol ? `08:${String(tol).padStart(2, '0')} = corta` : `08:${String(m).padStart(2, '0')} = ${Math.round(100 * (1 - m / tol))}%`))
      .filter((v, i, a) => a.indexOf(v) === i).join("   ·   ");

  return (
    <div className="flex flex-col gap-7 anim-up">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="chip mb-3"><SlidersHorizontal className="w-3.5 h-3.5" /> Configuração</div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-ink">Parâmetros de cálculo</h1>
          <p className="text-muted mt-1">Grupos de jornada, tolerância e atribuição dos colaboradores.</p>
        </div>
        <button onClick={() => { update(structuredClone(DEFAULT_PARAMS)); toast("Padrões restaurados", { description: "Configurações voltaram ao formato de fábrica." }); }} className="btn btn-outline btn-sm">
          <RotateCcw className="w-3.5 h-3.5" /> Restaurar padrão
        </button>
      </header>

      {/* Tolerância global */}
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl grid place-items-center bg-brand-50 text-brand flex-none"><Clock className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Tolerância padrão</h3>
              <p className="text-sm text-muted">Usada quando o grupo não define a própria.</p>
            </div>
          </div>
          <Stepper value={gTol} onChange={setGlobalTol} min={1} max={30} suffix="min" />
        </div>
        <div className="mt-4 rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}>
          <Info className="w-4 h-4 flex-none" /><span className="tabular-nums">{example(gTol)}</span>
        </div>
      </section>

      {/* Grupos de jornada */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2.5"><Users2 className="w-5 h-5 text-brand" /> Grupos de jornada</h2>
          <button onClick={addGroup} className="btn btn-ghost btn-sm"><Plus className="w-4 h-4" /> Novo grupo</button>
        </div>

        {cfg.groups.map((g) => {
          const editing = editingId === g.id;
          const memberCount = employees.filter((e) => effectiveGroup(cfg, e).group?.id === g.id).length;
          return (
            <div key={g.id} className="card p-0 overflow-hidden card-hover"
                 style={editing ? { borderColor: g.color, boxShadow: "var(--sh)" } : undefined}>
              <div className="h-1" style={{ background: g.color }} />
              <div className="p-5 flex flex-col gap-4">
                {/* Cabeçalho do grupo */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="w-3 h-3 rounded-full flex-none" style={{ background: g.color }} />
                  {editing ? (
                    <input value={g.name} onChange={(e) => setGroup(g.id, { name: e.target.value })} autoFocus
                      className="field px-3 py-2 text-[15px] font-bold min-w-[180px] flex-1" />
                  ) : (
                    <div className="flex-1 min-w-[180px]">
                      <div className="text-[15px] font-bold text-ink">{g.name}</div>
                      <div className="text-xs text-muted-2 mt-0.5">
                        Tolerância {g.toleranceMinutes} min · {memberCount} colaborador{memberCount === 1 ? "" : "es"}
                      </div>
                    </div>
                  )}

                  {editing && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-2 font-medium">Tolerância</span>
                      <Stepper value={g.toleranceMinutes} onChange={(v) => setGroup(g.id, { toleranceMinutes: v })} min={1} max={30} suffix="min" />
                    </div>
                  )}

                  {editing ? (
                    <div className="flex items-center gap-2 flex-none">
                      <button onClick={() => removeGroup(g.id)} className="w-9 h-9 rounded-lg grid place-items-center text-muted-2 hover:text-bad hover:bg-bad-soft transition-colors" title="Remover grupo">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn btn-sm"><Check className="w-4 h-4" /> Concluir</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingId(g.id)} className="btn btn-outline btn-sm flex-none"><Pencil className="w-3.5 h-3.5" /> Editar</button>
                  )}
                </div>

                {/* Jornada por dia da semana */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {WEEKDAYS.map((d) => {
                    const val = g.scheduleByDay[d];
                    if (editing) {
                      const isFolga = !val;
                      return (
                        <div key={d} className={`daychip ${isFolga ? "folga" : ""}`}>
                          <span className="dc-lbl">{d}</span>
                          <select 
                            className="dc-in cursor-pointer font-bold outline-none"
                            style={{ padding: "4px 2px", marginBottom: isFolga ? "0" : "4px", appearance: "none", textAlign: "center" }}
                            value={isFolga ? "off" : "work"}
                            onChange={(e) => setGroupDay(g.id, d, e.target.value === "off" ? "" : "08:00-12:00 13:00-18:00")}
                          >
                            <option value="work">Trabalho</option>
                            <option value="off">Folga</option>
                          </select>
                          {!isFolga && (
                            <input className={`dc-in ${!/^(\d{2}:\d{2}-\d{2}:\d{2}( \d{2}:\d{2}-\d{2}:\d{2})?)?$/.test(val ?? "") ? "border-bad" : ""}`} 
                              value={val ?? ""} placeholder="Jornada" title={WEEKDAY_FULL[d]}
                              onChange={(e) => setGroupDay(g.id, d, e.target.value)} />
                          )}
                        </div>
                      );
                    }
                    return (
                      <div key={d} className={`daychip-ro ${val ? "" : "folga"}`} title={WEEKDAY_FULL[d]}>
                        <span className="dc-lbl">{d}</span>
                        <span className="dc-val">{val ?? "Folga"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </section>

    </div>
  );
}
