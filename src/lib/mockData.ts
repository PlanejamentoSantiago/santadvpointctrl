import { Employee, TimeRecord, ExceptionEvent } from "../types";

/* Batidas CRUAS — status/aderência são calculados pelo motor (engine.ts).
   A jornada de cada dia é definida pelo GRUPO do colaborador (detectado
   automaticamente pela jornada dos registros). Ver src/lib/params.ts. */

let idc = 0;
function rec(
  employeeId: string,
  date: string,
  dow: string,
  schedule: string,
  in1: string | null,
  out1: string | null,
  in2: string | null,
  out2: string | null,
): TimeRecord {
  return {
    id: `r${++idc}`,
    employeeId,
    date,
    dayOfWeek: dow,
    expectedSchedule: schedule,
    checkIn1: in1, checkOut1: out1, checkIn2: in2, checkOut2: out2,
    totalNormalHours: "", totalFaultDays: 0, delayAndFaultHours: "", excusedHours: "", overtime: "", bankBalance: "",
    status: "Presente", adherencePercentage: 0,
  };
}

// jornadas de referência (batem com os grupos padrão)
const ADM_MQ = "08:00-12:00 13:00-18:00"; // seg–qui
const ADM_SX = "08:00-12:00 13:00-17:00"; // sexta
const TEC = "09:00-12:00 13:00-18:00";
const DIR = "08:00-12:00 14:00-18:00";
const CCM = "08:00-12:00 13:00-16:25"; // call center manhã
const CCT = "09:45-12:45 13:45-18:00"; // call center tarde

export const mockEmployees: Employee[] = [
  {
    id: "emp-001", name: "EMANUEL LUCAS GUIMARAES", pis: "27069259811", cpf: "62586185374",
    role: "ANALISTA DE PLANEJAMENTO", department: "ADMINISTRATIVO", admissionDate: "2026-03-12",
    expectedSchedule: ADM_MQ, adherenceScore: 0, isDisqualified: false,
    records: [
      rec("emp-001", "2026-06-01", "SEG", ADM_MQ, "08:00", "12:00", "13:00", "18:00"),
      rec("emp-001", "2026-06-02", "TER", ADM_MQ, "08:01", "12:00", "13:00", "18:00"), // atraso manhã
      rec("emp-001", "2026-06-03", "QUA", ADM_MQ, "07:58", "12:05", "13:04", "18:00"),
      rec("emp-001", "2026-06-04", "QUI", ADM_MQ, "08:00", "12:00", "13:00", "18:00"),
      rec("emp-001", "2026-06-05", "SEX", ADM_SX, "08:00", "12:00", "13:00", "17:00"), // sexta sai 17h
      rec("emp-001", "2026-06-29", "SEG", ADM_MQ, "07:57", "11:57", null, null),        // Falta
      rec("emp-001", "2026-07-08", "QUA", ADM_MQ, "07:52", null, null, null),           // Falta
    ],
  },
  {
    id: "emp-002", name: "ANA CLARA SILVA", pis: "12345678901", cpf: "11122233344",
    role: "DESENVOLVEDORA FRONTEND", department: "TECNOLOGIA", admissionDate: "2025-01-10",
    expectedSchedule: TEC, adherenceScore: 0, isDisqualified: false,
    records: [
      rec("emp-002", "2026-06-01", "SEG", TEC, "09:00", "12:00", "13:00", "18:00"),
      rec("emp-002", "2026-06-02", "TER", TEC, "08:58", "12:00", "13:00", "18:00"),
      rec("emp-002", "2026-06-03", "QUA", TEC, "09:01", "12:10", "13:10", "18:00"), // atraso manhã
      rec("emp-002", "2026-06-04", "QUI", TEC, "09:00", "12:00", "12:59", "18:01"), // saída 18:01
      rec("emp-002", "2026-06-05", "SEX", TEC, "08:55", "12:00", "13:00", "18:00"),
    ],
  },
  {
    id: "emp-003", name: "CARLOS EDUARDO SANTOS", pis: "98765432100", cpf: "55566677788",
    role: "GERENTE DE PROJETOS", department: "DIRETORIA", admissionDate: "2020-05-15",
    expectedSchedule: DIR, adherenceScore: 0, isDisqualified: false,
    records: [
      rec("emp-003", "2026-06-01", "SEG", DIR, "08:00", "12:00", "14:00", "18:00"),
      rec("emp-003", "2026-06-02", "TER", DIR, "07:58", "12:05", "14:05", "18:00"),
      rec("emp-003", "2026-06-03", "QUA", DIR, "08:00", "12:00", "14:00", "18:00"),
      rec("emp-003", "2026-06-04", "QUI", DIR, "08:00", "11:50", "13:50", "18:00"),
      rec("emp-003", "2026-06-05", "SEX", DIR, "08:00", "12:00", "14:00", "18:00"),
    ],
  },
  {
    id: "emp-004", name: "BEATRIZ MENDES ROCHA", pis: "45678912300", cpf: "99988877766",
    role: "OPERADORA DE CALL CENTER", department: "CALL CENTER", admissionDate: "2024-08-01",
    expectedSchedule: CCM, adherenceScore: 0, isDisqualified: false,
    records: [
      rec("emp-004", "2026-06-01", "SEG", CCM, "08:00", "12:00", "13:00", "16:25"),
      rec("emp-004", "2026-06-02", "TER", CCM, "08:00", "12:00", "13:00", "16:25"),
      rec("emp-004", "2026-06-03", "QUA", CCM, "07:58", "12:00", "13:00", "16:25"),
      rec("emp-004", "2026-06-04", "QUI", CCM, "08:01", "12:00", "13:00", "16:25"), // atraso manhã
      rec("emp-004", "2026-06-05", "SEX", CCM, "08:00", "12:00", "13:00", "16:25"),
    ],
  },
  {
    id: "emp-005", name: "DIEGO FERREIRA LIMA", pis: "32165498700", cpf: "44455566677",
    role: "OPERADOR DE CALL CENTER", department: "CALL CENTER", admissionDate: "2025-11-03",
    expectedSchedule: CCT, adherenceScore: 0, isDisqualified: false,
    records: [
      rec("emp-005", "2026-06-01", "SEG", CCT, "09:45", "12:45", "13:45", "18:00"),
      rec("emp-005", "2026-06-02", "TER", CCT, "09:44", "12:45", "13:45", "18:00"),
      rec("emp-005", "2026-06-03", "QUA", CCT, "09:45", "12:45", "13:47", "18:00"), // volta +2min -> corta
      rec("emp-005", "2026-06-04", "QUI", CCT, "09:45", "12:45", "13:45", "18:00"),
      rec("emp-005", "2026-06-05", "SEX", CCT, "09:45", "12:45", "13:45", "18:00"),
    ],
  },
];

export const mockExceptions: ExceptionEvent[] = [];
