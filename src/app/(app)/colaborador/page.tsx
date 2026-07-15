"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users2, CheckCircle2, RotateCcw, Eye, Pencil } from "lucide-react";
import { useParamsConfig, effectiveGroup } from "@/lib/params";
import { useEmployees } from "@/lib/useEmployees";
import { fmtName, initials } from "@/lib/utils";
import EmployeeSearch from "@/components/EmployeeSearch";

export default function EspelhoPage() {
  const router = useRouter();
  const [cfg, update] = useParamsConfig();
  const employees = useEmployees();
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [editingGroup, setEditingGroup] = useState<string | null>(null);

  const gTol = cfg.global.toleranceMinutes;
  const groupCount = (gid: string) => employees.filter((e) => effectiveGroup(cfg, e).group?.id === gid).length;
  const filteredEmployees = employees.filter(
    (e) => filterGroup === "all" || effectiveGroup(cfg, e).group?.id === filterGroup,
  );

  const setEmpGroup = (id: string, gid: string) => {
    const next = { ...cfg.employeeGroup };
    if (!gid) delete next[id];
    else next[id] = gid;
    update({ ...cfg, employeeGroup: next });
  };

  return (
    <div className="flex flex-col gap-6 anim-up">
      <div>
        <h1 className="text-3xl font-extrabold text-ink tracking-tight mb-2 flex items-center gap-2">
          <Users2 className="w-8 h-8 text-brand" /> Colaboradores
        </h1>
        <p className="text-muted">
          Selecione um colaborador para visualizar o detalhamento da jornada diária e aplicar abonos.
        </p>
      </div>

      {/* Busca */}
      <div className="w-full max-w-md">
        <EmployeeSearch />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-5 lg:p-6 border-b border-line">
          <div className="flex items-center gap-2.5 mb-1">
            <h3 className="font-bold text-lg">Todos os Colaboradores</h3>
          </div>
          <p className="text-sm text-muted mb-4">
            O grupo é detectado automaticamente pela jornada dos registros. Ajuste manualmente em casos especiais.
          </p>

          {/* Filtro por grupo */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterGroup("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filterGroup === "all" ? "bg-brand text-white border-brand" : "border-line text-muted hover:bg-brand-50 hover:text-brand-700"}`}>
              Todos · {employees.length}
            </button>
            {cfg.groups.map((gr) => {
              const active = filterGroup === gr.id;
              return (
                <button key={gr.id} onClick={() => setFilterGroup(gr.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${active ? "text-white border-transparent" : "border-line text-ink-2 hover:bg-brand-50"}`}
                  style={active ? { background: gr.color } : undefined}>
                  <span className="w-2 h-2 rounded-full" style={{ background: active ? "#fff" : gr.color }} />
                  {gr.name} · {groupCount(gr.id)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="pc-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: '66px' }}>Colaborador</th>
                <th style={{ textAlign: 'center' }}>Cargo</th>
                <th style={{ textAlign: 'center' }}>Grupo</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted text-sm">
                    Nenhum colaborador encontrado. Faça a ingestão de dados primeiro.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const { group, auto } = effectiveGroup(cfg, emp);
                  const isManual = !!cfg.employeeGroup[emp.id];
                  return (
                    <tr key={emp.id} className="cursor-pointer hover:bg-surface-2 transition-colors group/row" onClick={() => router.push(`/colaborador/espelho?id=${emp.id}`)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-xl grid place-items-center text-[12px] font-bold text-brand bg-brand-50 flex-none group-hover/row:bg-white group-hover/row:shadow-[var(--sh-xs)] transition-all">{initials(emp.name)}</span>
                          <div>
                            <div className="font-bold text-ink whitespace-nowrap group-hover/row:text-brand transition-colors">{fmtName(emp.name)}</div>
                            <div className="text-[11px] text-muted-2 font-semibold mt-0.5">{emp.department}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted text-sm" style={{ textAlign: 'center' }}>{emp.role}</td>
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                        {editingGroup === emp.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <select className="select py-1.5 text-xs h-auto" value={group?.id ?? ""} onChange={(e) => { setEmpGroup(emp.id, e.target.value); setEditingGroup(null); }}>
                              {!group && <option value="">— selecionar —</option>}
                              {cfg.groups.map((gr) => <option key={gr.id} value={gr.id}>{gr.name}</option>)}
                            </select>
                            {isManual && (
                              <button onClick={() => { setEmpGroup(emp.id, ""); setEditingGroup(null); }} title="Voltar para automático"
                                className="w-7 h-7 rounded-lg grid place-items-center text-muted-2 hover:text-brand hover:bg-brand-50 transition-colors flex-none">
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            {group ? (
                              <div className="chip" style={{ color: group.color, background: `color-mix(in srgb, ${group.color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${group.color} 30%, transparent)` }}>
                                <span className="w-2 h-2 rounded-full" style={{ background: group.color }} />
                                {group.name}
                              </div>
                            ) : (
                              <span className="text-muted-2 text-xs italic">Sem grupo detectado</span>
                            )}
                            {auto && group && (
                              <span className="status status-good text-[10px] px-2 py-0.5 flex-none" title="Grupo detectado automaticamente">
                                <CheckCircle2 className="w-3 h-3" /> auto
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="flex justify-center gap-2 items-center">
                          <button onClick={(e) => { e.stopPropagation(); setEditingGroup(editingGroup === emp.id ? null : emp.id); }} title="Editar grupo"
                            className={`btn btn-sm flex-none ${editingGroup === emp.id ? 'btn-outline border-brand text-brand shadow-sm' : 'btn-outline border-line text-ink-2 hover:border-brand-400 hover:text-brand'}`}>
                            <Pencil className="w-3.5 h-3.5" /> {editingGroup === emp.id ? "Cancelar" : "Editar"}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); router.push(`/colaborador/espelho?id=${emp.id}`); }} title="Visualizar espelho"
                            className="btn btn-sm flex-none btn-outline border-line text-ink-2 hover:border-brand hover:text-brand shadow-sm">
                            <Eye className="w-3.5 h-3.5" /> Ver espelho
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
