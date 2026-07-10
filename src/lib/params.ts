import { useEffect, useState } from "react";
import { Employee } from "../types";

export type Weekday = "SEG" | "TER" | "QUA" | "QUI" | "SEX" | "SAB" | "DOM";
export const WEEKDAYS: Weekday[] = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];
export const WEEKDAY_FULL: Record<Weekday, string> = {
  SEG: "Segunda", TER: "Terça", QUA: "Quarta", QUI: "Quinta", SEX: "Sexta", SAB: "Sábado", DOM: "Domingo",
};

/** Grupo de jornada (turno). A jornada de cada dia vem daqui; null = folga. */
export interface WorkGroup {
  id: string;
  name: string;
  color: string;
  toleranceMinutes: number;
  scheduleByDay: Record<Weekday, string | null>;
}

export interface ParamsConfig {
  global: { toleranceMinutes: number };
  groups: WorkGroup[];
  /** empId -> groupId (atribuição manual; ausente = detecção automática) */
  employeeGroup: Record<string, string>;
}

export const GROUP_COLORS = ["#2563eb", "#7c3aed", "#0f9d76", "#c98a2b", "#e0564f", "#0891b2", "#db2777"];

const week = (segQui: string, sex: string, sab: string | null = null, dom: string | null = null): Record<Weekday, string | null> =>
  ({ SEG: segQui, TER: segQui, QUA: segQui, QUI: segQui, SEX: sex, SAB: sab, DOM: dom });

export const DEFAULT_GROUPS: WorkGroup[] = [
  { id: "g-adm", name: "Administrativo", color: "#2563eb", toleranceMinutes: 2, scheduleByDay: week("08:00-12:00 13:00-18:00", "08:00-12:00 13:00-17:00") },
  { id: "g-tec", name: "Tecnologia", color: "#7c3aed", toleranceMinutes: 2, scheduleByDay: week("09:00-12:00 13:00-18:00", "09:00-12:00 13:00-18:00") },
  { id: "g-dir", name: "Diretoria", color: "#0f9d76", toleranceMinutes: 2, scheduleByDay: week("08:00-12:00 14:00-18:00", "08:00-12:00 14:00-18:00") },
  { id: "g-ccm", name: "Call Center — Manhã", color: "#c98a2b", toleranceMinutes: 2, scheduleByDay: week("08:00-12:00 13:00-16:25", "08:00-12:00 13:00-16:25") },
  { id: "g-cct", name: "Call Center — Tarde", color: "#e0564f", toleranceMinutes: 2, scheduleByDay: week("09:45-12:45 13:45-18:00", "09:45-12:45 13:45-18:00") },
];

export const DEFAULT_PARAMS: ParamsConfig = {
  global: { toleranceMinutes: 2 },
  groups: DEFAULT_GROUPS,
  employeeGroup: {},
};

const KEY = "pc-params-v2";

export function loadParams(): ParamsConfig {
  if (typeof window === "undefined") return DEFAULT_PARAMS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PARAMS;
    const p = JSON.parse(raw);
    return {
      global: { ...DEFAULT_PARAMS.global, ...(p.global || {}) },
      groups: Array.isArray(p.groups) && p.groups.length ? p.groups : DEFAULT_GROUPS,
      employeeGroup: p.employeeGroup || {},
    };
  } catch {
    return DEFAULT_PARAMS;
  }
}

export function saveParams(p: ParamsConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new Event("pc-params-change"));
  } catch {}
}

/* ============================ detecção de grupo ============================ */

const normSched = (s?: string | null) => (s || "").replace(/\s+/g, " ").trim();
const isWorking = (s?: string | null) => !!s && /\d{1,2}:\d{2}/.test(s);

/** Detecta o grupo do colaborador comparando a jornada dos registros com a dos grupos. */
export function detectGroup(emp: Employee, groups: WorkGroup[]): WorkGroup | null {
  const obs: Partial<Record<Weekday, string>> = {};
  for (const r of emp.records) {
    if (!isWorking(r.expectedSchedule)) continue;
    const d = r.dayOfWeek as Weekday;
    if (!obs[d]) obs[d] = normSched(r.expectedSchedule);
  }
  const days = Object.keys(obs) as Weekday[];
  if (!days.length) return null;

  let best: WorkGroup | null = null;
  let bestRatio = 0;
  for (const g of groups) {
    let m = 0;
    for (const d of days) if (normSched(g.scheduleByDay[d]) === obs[d]) m++;
    const ratio = m / days.length;
    if (ratio > bestRatio) { bestRatio = ratio; best = g; }
  }
  return bestRatio >= 0.6 ? best : null;
}

/** Grupo efetivo do colaborador (manual tem prioridade; senão, detectado). */
export function effectiveGroup(cfg: ParamsConfig, emp: Employee): { group: WorkGroup | null; auto: boolean } {
  const manualId = cfg.employeeGroup[emp.id];
  if (manualId) return { group: cfg.groups.find((g) => g.id === manualId) || null, auto: false };
  return { group: detectGroup(emp, cfg.groups), auto: true };
}

/* ============================ hook ============================ */

export function useParamsConfig(): [ParamsConfig, (p: ParamsConfig) => void] {
  const [cfg, setCfg] = useState<ParamsConfig>(DEFAULT_PARAMS);

  useEffect(() => {
    setCfg(loadParams());
    const h = () => setCfg(loadParams());
    window.addEventListener("pc-params-change", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("pc-params-change", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  const update = (p: ParamsConfig) => { setCfg(p); saveParams(p); };
  return [cfg, update];
}
