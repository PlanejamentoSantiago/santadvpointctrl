export type DailyStatus = 'Ok' | 'Presente' | 'Atraso Entrada' | 'Atraso Almoço' | 'Atraso Saída' | 'Saída Antecipada' | 'Falta' | 'Abonado' | 'Feriado' | 'Folga' | 'Férias' | 'Não Contabilizado' | 'Licença Casamento' | 'INSS' | 'Declaração';

export interface TimeRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  expectedSchedule: string;
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
  adherenceScore: number; // 0 to 100
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
