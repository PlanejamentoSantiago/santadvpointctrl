import { Employee, TimeRecord, ExceptionEvent } from "../types";
import { ParamsConfig, DEFAULT_PARAMS, effectiveGroup, Weekday } from "./params";

/* ============================ helpers de tempo ============================ */

/** "07:55 (C)" -> 475 (minutos). Limpa flags. null se não houver hora. */
export function toMinutes(t?: string | null): number | null {
  if (!t) return null;
  const m = t.replace(/[^\d:]/g, "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export interface ParsedSchedule {
  start: number;
  lunchOut?: number;
  lunchIn?: number;
  end: number;
}

/** "08:00-12:00 13:00-18:00" -> {start,lunchOut,lunchIn,end}. null = folga/feriado. */
export function parseSchedule(s?: string): ParsedSchedule | null {
  if (!s) return null;
  const times = (s.match(/\d{1,2}:\d{2}/g) || []).map((t) => toMinutes(t)!);
  if (times.length >= 4) return { start: times[0], lunchOut: times[1], lunchIn: times[2], end: times[3] };
  if (times.length === 2) return { start: times[0], end: times[1] };
  return null;
}

/* ============================ pontuação das batidas ============================ */

/** Atraso: no alvo (ou antes) = 100; decai linear; ao atingir a tolerância = 0. */
function scoreLate(actual: number, target: number, tol: number): number {
  if (actual <= target) return 100;
  if (actual >= target + tol) return 0;
  return Math.round(100 * (1 - (actual - target) / tol));
}

/** Saída: janela de (alvo - 3m) até alvo = 100; sair antes da tolerância = 0; sair depois do alvo reduz até tol. */
function scoreDeparture(actual: number, target: number, tol: number): { score: number, type: 'Early' | 'Late' | 'Ok' } {
  if (actual >= target - 3 && actual <= target) return { score: 100, type: 'Ok' }; // 3 minutos cravados para saída
  if (actual < target - 3) return { score: 0, type: 'Early' }; // Saída muito antecipada
  if (actual >= target + tol) return { score: 0, type: 'Late' }; // Saída atrasada (hora extra indevida)
  return { score: Math.round(100 * (1 - (actual - target) / tol)), type: 'Late' };
}

/* ============================ processamento de um dia ============================ */

function processRecord(r: TimeRecord, tol: number, resolvedSchedule: string | null | undefined): TimeRecord {
  const statusArr = Array.isArray(r.status) ? r.status : [r.status];
  // Se o relatório original já definiu explicitamente como Folga, Feriado ou Férias, é soberano
  if (statusArr.includes("Folga") || statusArr.includes("Feriado") || statusArr.includes("Férias")) {
    return { ...r, expectedSchedule: statusArr[0], status: statusArr, adherencePercentage: 100 };
  }

  // undefined = sem grupo -> usa a jornada do próprio registro; null = folga definida pelo grupo
  const schedStr = resolvedSchedule === undefined ? r.expectedSchedule : resolvedSchedule;
  const sched = parseSchedule(schedStr || undefined);

  // dia não-útil (folga / feriado / férias)
  if (!sched) {
    const st: TimeRecord["status"] = statusArr.includes("Feriado") ? ["Feriado"] : statusArr.includes("Férias") ? ["Férias"] : ["Folga"];
    return { ...r, expectedSchedule: schedStr || "Folga", status: st, adherencePercentage: 100 };
  }

  // guarda a jornada efetivamente usada (para exibição no espelho)
  const expectedSchedule = schedStr || r.expectedSchedule;

  // já abonado por justificativa manual
  if (r.justification) {
    return { ...r, expectedSchedule, status: ["Abonado"], adherencePercentage: 100 };
  }

  const in1 = toMinutes(r.checkIn1);
  const out1 = toMinutes(r.checkOut1);
  const in2 = toMinutes(r.checkIn2);
  const out2 = toMinutes(r.checkOut2);
  const hasLunch = sched.lunchOut != null && sched.lunchIn != null;

  // falta integral: não bateu nada
  if (in1 == null && out1 == null && in2 == null && out2 == null) {
    return { ...r, expectedSchedule, status: ["Falta"], adherencePercentage: 0 };
  }

  const scores: number[] = [];
  let incomplete = false;
  let hasAtraso = false;
  let hasSaidaAntecipada = false;
  
  let tags: import("../types").DailyStatus[] = [];

  // 1) entrada da manhã
  if (in1 == null) { incomplete = true; scores.push(0); }
  else {
    const s = scoreLate(in1, sched.start, tol);
    scores.push(s);
    if (s === 0) tags.push("Atraso Entrada");
  }

  if (hasLunch) {
    const lunchDur = sched.lunchIn! - sched.lunchOut!;
    // 2) volta do almoço — alvo = saída 1 real + duração do almoço
    if (out1 == null) incomplete = true;
    if (in2 == null) { incomplete = true; scores.push(0); }
    else if (out1 != null) {
      const s = scoreLate(in2, out1 + lunchDur, tol);
      scores.push(s);
      if (s === 0) tags.push("Atraso Almoço");
    }
    else scores.push(0);
    // 3) saída final
    if (out2 == null) { incomplete = true; scores.push(0); }
    else {
      const res = scoreDeparture(out2, sched.end, tol);
      scores.push(res.score);
      if (res.type === 'Early' && res.score === 0) tags.push("Saída Antecipada");
      else if (res.type === 'Late' && res.score === 0) tags.push("Atraso Saída"); // Hora extra conta como atraso genérico para status
    }
  } else {
    // jornada sem almoço: saída = out1
    if (out1 == null) { incomplete = true; scores.push(0); }
    else {
      const res = scoreDeparture(out1, sched.end, tol);
      scores.push(res.score);
      if (res.type === 'Early' && res.score === 0) tags.push("Saída Antecipada");
      else if (res.type === 'Late' && res.score === 0) tags.push("Atraso Saída");
    }
  }

  const adherence = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  if (incomplete) tags = ["Falta"];           // turno incompleto = falta parcial (desclassifica)
  else if (tags.length === 0) tags = ["Ok"];

  return { ...r, expectedSchedule, status: tags, adherencePercentage: adherence };
}

/* ============================ processamento do colaborador ============================ */

const brDate = (iso: string) => iso.split("-").reverse().join("/").slice(0, 5);

export function processEmployees(
  employees: Employee[],
  exceptions: ExceptionEvent[] = [],
  params: ParamsConfig = DEFAULT_PARAMS,
): Employee[] {
  return employees.map((emp) => {
    const { group } = effectiveGroup(params, emp);
    const tol = group?.toleranceMinutes ?? params.global.toleranceMinutes;

    let records = emp.records.map((r) => {
      // undefined = sem grupo (usa jornada do registro); string|null = definido pelo grupo
      const resolved = group ? group.scheduleByDay[r.dayOfWeek as Weekday] ?? null : undefined;
      return processRecord(r, tol, resolved);
    });

    records = records.map((r) => {
      // overrides manuais na tela do colaborador
      const ov = (r as any).manualOverride;
      if (ov) {
        if (ov === "Falta Abonada" || ov.startsWith("Falta Justificada:")) {
          return { ...r, status: ["Abonado"], justification: ov, adherencePercentage: 100 };
        }
        if (ov === "Falta") {
          return { ...r, status: ["Falta"], adherencePercentage: 0 };
        }
      }

      const ex = exceptions.find(
        (e) => e.date === r.date && (e.targetDepartment == null || e.targetDepartment === emp.department),
      );
      if (ex && (r.status.includes("Falta") || r.status.some(s => s.startsWith("Atraso")))) {
        return { ...r, status: ["Abonado"], adherencePercentage: 100, justification: ex.description };
      }
      return r;
    });

    const faltas = records.filter((r) => r.status.includes("Falta"));
    const isDisqualified = faltas.length > 0;

    const valid = records.filter((r) => !r.status.includes("Feriado") && !r.status.includes("Folga") && !r.status.includes("Férias"));
    const avg = valid.length ? valid.reduce((a, r) => a + r.adherencePercentage, 0) / valid.length : 0;

    return {
      ...emp,
      records,
      adherenceScore: parseFloat(avg.toFixed(1)),
      isDisqualified,
      disqualificationReason: isDisqualified ? `Faltas em: ${faltas.map(f => brDate(f.date)).join(", ")}` : undefined,
    };
  });
}

/** TOP 3 do ranking (só elegíveis). */
export function getTopRanking(employees: Employee[]) {
  return employees
    .filter((e) => !e.isDisqualified)
    .sort((a, b) => b.adherenceScore - a.adherenceScore)
    .slice(0, 3);
}
