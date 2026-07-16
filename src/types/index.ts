export type DailyStatus = 'Ok' | 'Presente' | 'Atraso Entrada' | 'Atraso Almoço' | 'Atraso Pausa' | 'Atraso Saída' | 'Saída Antecipada' | 'Falta' | 'Abonado' | 'Feriado' | 'Folga' | 'Férias' | 'Home Office' | 'Aniversário' | 'Atestado Médico' | 'Não Contabilizado' | 'Licença Casamento' | 'INSS' | 'Declaração';

export interface TimeRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  /** Jornada do dia. 1 bloco por par: "08:00-10:00 10:10-12:00 13:00-14:30 14:40-16:12" */
  expectedSchedule: string;
  /**
   * Todas as batidas do dia, em ordem: [entrada, saída1, volta1, saída2, volta2, ..., saídaFinal].
   * Administrativo tem 4; cobrança tem 8 (por causa das pausas de 10 min).
   */
  punches: (string | null)[];
  // legado — espelham punches[0..3]; mantidos para as telas antigas
  checkIn1: string | null;
  checkOut1: string | null;
  checkIn2: string | null;
  checkOut2: string | null;
  totalNormalHours: string;
  totalFaultDays: number;
  delayAndFaultHours: string; // HH:mm
  excusedHours: string; // HH:mm
  overtime: string; // HH:mm
  bankBalance: string; // HH:mm
  status: DailyStatus[];
  adherencePercentage: number;
  justification?: string;
}

export interface Employee {
  id: string;
  name: string;
  pis: string;
  cpf: string;
  role: string;
  department: string;
  admissionDate: string;
  expectedSchedule: string;
  adherenceScore: number; // 0 to 100 — média de aderência das batidas
  /** Dias úteis avaliados no período (exclui folga/feriado/férias/abonado). */
  evaluatedDays?: number;
  /** Dias em que TODAS as batidas ficaram dentro da tolerância. */
  punctualDays?: number;
  /** punctualDays / evaluatedDays * 100 — é isto que classifica a pessoa no mês. */
  punctualityRate?: number;
  classification?: 'Pontual' | 'Regular' | 'Irregular' | 'Sem dados';
  isDisqualified: boolean;
  disqualificationReason?: string;
  alterations?: string[];
  records: TimeRecord[];
}

export interface ExceptionEvent {
  id: string;
  date: string;
  type: 'Batch' | 'Manual';
  description: string;
  targetDepartment?: string; // Se undefined, aplica a todos
}
