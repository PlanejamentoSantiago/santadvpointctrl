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

/** Um bloco de trabalho contínuo (entre uma entrada e a saída seguinte). */
export interface ScheduleBlock {
  start: number;
  end: number;
}

/**
 * "08:00-12:00 13:00-18:00"                       -> 2 blocos (administrativo)
 * "08:00-10:00 10:10-12:00 13:00-14:30 14:40-16:12" -> 4 blocos (cobrança, com pausas)
 * null = folga/feriado.
 */
export function parseSchedule(s?: string): ScheduleBlock[] | null {
  if (!s) return null;
  const t = (s.match(/\d{1,2}:\d{2}/g) || []).map((x) => toMinutes(x)!);
  if (t.length < 2 || t.length % 2 !== 0) return null;
  const blocks: ScheduleBlock[] = [];
  for (let i = 0; i < t.length; i += 2) blocks.push({ start: t[i], end: t[i + 1] });
  return blocks;
}

/* ============================ pontuação das batidas ============================ */

/**
 * Entrada / volta do almoço.
 * Dentro da tolerância vale 100% (08:00–08:02 = 100). Passando dela, a batida
 * continua válida mas perde `decay`% por minuto (5%/min → zera ~20 min depois).
 */
function scoreLate(actual: number, target: number, tol: number, decay: number): number {
  if (actual <= target + tol) return 100;
  return Math.max(0, Math.round(100 - (actual - target - tol) * decay));
}

/**
 * Saída. Janela 100% = [alvo - earlyGrace, alvo + tol].
 * Ex.: 08–18 com grace 3 e tol 2 → 17:57 às 18:02 = 100%.
 * Cobrança (grace 0) → 18:00 às 18:02. Fora da janela decai `decay`% por minuto.
 */
function scoreDeparture(
  actual: number, target: number, tol: number, earlyGrace: number, decay: number,
): { score: number; type: "Early" | "Late" | "Ok" } {
  const from = target - earlyGrace;
  const to = target + tol;
  if (actual >= from && actual <= to) return { score: 100, type: "Ok" };
  if (actual < from) return { score: Math.max(0, Math.round(100 - (from - actual) * decay)), type: "Early" };
  return { score: Math.max(0, Math.round(100 - (actual - to) * decay)), type: "Late" };
}

/* ============================ processamento de um dia ============================ */

interface ScoreOpts {
  tol: number;
  decay: number;
  earlyGrace: number;
  /** Intervalos até esta duração são "pausa" (estrita). Acima disso é almoço. */
  breakMaxMinutes: number;
  /** Tolerância das pausas curtas (0 = bateu 9:35, tem até 9:45; 9:46 já atrasa). */
  breakTolerance: number;
}

function processRecord(r: TimeRecord, opts: ScoreOpts, resolvedSchedule: string | null | undefined): TimeRecord {
  const { tol, decay, earlyGrace, breakMaxMinutes, breakTolerance } = opts;
  const statusArr = Array.isArray(r.status) ? r.status : [r.status];
  // Se o relatório original já definiu explicitamente como Folga, Feriado, Férias ou Atestado, é soberano
  if (statusArr.includes("Folga") || statusArr.includes("Feriado") || statusArr.includes("Férias") || statusArr.includes("Atestado Médico") || statusArr.includes("Home Office") || statusArr.includes("Abonado") || statusArr.includes("Aniversário") || statusArr.includes("Licença Casamento") || statusArr.includes("Não Contabilizado") || statusArr.includes("INSS") || statusArr.includes("Declaração")) {
    return { ...r, expectedSchedule: statusArr[0], status: statusArr, adherencePercentage: 100 };
  }

  // undefined = sem grupo -> usa a jornada do próprio registro; null = folga definida pelo grupo
  const schedStr = resolvedSchedule === undefined ? r.expectedSchedule : resolvedSchedule;
  const sched = parseSchedule(schedStr || undefined);

  // dia não-útil (folga / feriado / férias / atestado / home office / abonado / aniversário / licença casamento / não contabilizado / inss / declaração)
  if (!sched) {
    const st: TimeRecord["status"] = statusArr.includes("Feriado") ? ["Feriado"] : statusArr.includes("Férias") ? ["Férias"] : statusArr.includes("Atestado Médico") ? ["Atestado Médico"] : statusArr.includes("Home Office") ? ["Home Office"] : statusArr.includes("Abonado") ? ["Abonado"] : statusArr.includes("Aniversário") ? ["Aniversário"] : statusArr.includes("Licença Casamento") ? ["Licença Casamento"] : statusArr.includes("INSS") ? ["INSS"] : statusArr.includes("Declaração") ? ["Declaração"] : statusArr.includes("Não Contabilizado") ? ["Não Contabilizado"] : ["Folga"];
    return { ...r, expectedSchedule: schedStr || "Folga", status: st, adherencePercentage: 100 };
  }

  // guarda a jornada efetivamente usada (para exibição no espelho)
  const expectedSchedule = schedStr || r.expectedSchedule;

  // já abonado por justificativa manual
  if (r.justification) {
    return { ...r, expectedSchedule, status: ["Abonado"], adherencePercentage: 100 };
  }

  // batidas em ordem; cai no legado se o registro for antigo (sem `punches`)
  const raw = r.punches ?? [r.checkIn1, r.checkOut1, r.checkIn2, r.checkOut2];
  const p = raw.map(toMinutes);
  const n = sched.length; // nº de blocos: 2 = adm, 4 = cobrança

  // falta integral: não bateu nada
  if (p.every((x) => x == null)) {
    return { ...r, expectedSchedule, status: ["Falta"], adherencePercentage: 0 };
  }

  const scores: number[] = [];
  let incomplete = false;
  const tags: import("../types").DailyStatus[] = [];

  // 1) entrada — alvo = início do primeiro bloco
  if (p[0] == null) { incomplete = true; scores.push(0); }
  else {
    const s = scoreLate(p[0], sched[0].start, tol, decay);
    scores.push(s);
    if (s < 100) tags.push("Atraso Entrada");
  }

  // 2) cada intervalo (pausa ou almoço): alvo = batida REAL de saída + duração prevista
  for (let k = 0; k < n - 1; k++) {
    const out = p[2 * k + 1];       // saída do bloco k
    const back = p[2 * k + 2];      // volta do intervalo k
    const dur = sched[k + 1].start - sched[k].end;
    // pausa curta (10 min) é estrita; almoço usa a tolerância normal
    const isBreak = dur <= breakMaxMinutes;
    const iTol = isBreak ? breakTolerance : tol;

    if (out == null || back == null) { incomplete = true; scores.push(0); continue; }
    const s = scoreLate(back, out + dur, iTol, decay);
    scores.push(s);
    if (s < 100) tags.push(isBreak ? "Atraso Pausa" : "Atraso Almoço");
  }

  // 3) saída final — alvo = fim do último bloco
  const last = p[2 * n - 1];
  if (last == null) { incomplete = true; scores.push(0); }
  else {
    const res = scoreDeparture(last, sched[n - 1].end, tol, earlyGrace, decay);
    scores.push(res.score);
    if (res.type === "Early" && res.score < 100) tags.push("Saída Antecipada");
    else if (res.type === "Late" && res.score < 100) tags.push("Atraso Saída");
  }

  const adherence = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // turno incompleto = falta parcial; senão, sem tag = dia limpo
  const finalTags: import("../types").DailyStatus[] =
    incomplete ? ["Falta"] : tags.length === 0 ? ["Ok"] : tags;

  return { ...r, expectedSchedule, status: finalTags, adherencePercentage: adherence };
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
    const opts: ScoreOpts = {
      tol: group?.toleranceMinutes ?? params.global.toleranceMinutes,
      decay: params.global.decayPerMinute,
      earlyGrace: group?.departureEarlyGrace ?? 0,
      breakMaxMinutes: params.global.breakMaxMinutes,
      breakTolerance: params.global.breakTolerance,
    };

    let records = emp.records.map((r) => {
      // undefined = sem grupo (usa jornada do registro); string|null = definido pelo grupo
      const resolved = group ? group.scheduleByDay[r.dayOfWeek as Weekday] ?? null : undefined;
      return processRecord(r, opts, resolved);
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

    const valid = records.filter((r) => !r.status.includes("Feriado") && !r.status.includes("Folga") && !r.status.includes("Férias") && !r.status.includes("Atestado Médico") && !r.status.includes("Home Office") && !r.status.includes("Abonado") && !r.status.includes("Aniversário") && !r.status.includes("Licença Casamento") && !r.status.includes("Não Contabilizado") && !r.status.includes("INSS") && !r.status.includes("Declaração"));
    const avg = valid.length ? valid.reduce((a, r) => a + r.adherencePercentage, 0) / valid.length : 0;

    // Visão do mês: um dia ruim não define a pessoa. O que classifica é a
    // PROPORÇÃO de dias pontuais (dia pontual = todas as batidas dentro da tolerância).
    const { punctualDayMargin, punctualThreshold, regularThreshold } = params.global;
    const evaluatedDays = valid.length;
    const punctualDays = valid.filter((r) => r.adherencePercentage >= punctualDayMargin).length;
    const punctualityRate = evaluatedDays ? (punctualDays / evaluatedDays) * 100 : 0;
    const classification: Employee["classification"] =
      evaluatedDays === 0 ? "Sem dados"
      : punctualityRate >= punctualThreshold ? "Pontual"
      : punctualityRate >= regularThreshold ? "Regular"
      : "Irregular";

    return {
      ...emp,
      records,
      adherenceScore: parseFloat(avg.toFixed(1)),
      evaluatedDays,
      punctualDays,
      punctualityRate: parseFloat(punctualityRate.toFixed(1)),
      classification,
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
