import Papa from "papaparse";
import { Employee, TimeRecord } from "../types";

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function getDayOfWeek(dateStr: string) {
  // expects YYYY-MM-DD
  const date = new Date(dateStr + "T00:00:00");
  const days = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
  return days[date.getDay()];
}

/**
 * Lê a tabela "HORÁRIO DE TRABALHO" do cabeçalho do funcionário:
 *   HORÁRIO DE TRABALHO ENT.1 SAÍ.1 ENT.2 SAÍ.2
 *   SEG 08:00 12:00 13:00 18:00 ... SEX 08:00 12:00 13:00 17:00  SAB DOM
 * Devolve { SEG: "08:00-12:00 13:00-18:00", ..., SAB: null }
 */
export function parseWeekSchedule(block: string): Record<string, string | null> {
  const res: Record<string, string | null> = {};
  const seg = block.match(/HOR[ÁA]RIO DE TRABALHO([\s\S]*?)\bDIA\b/);
  if (!seg) return res;

  const re = /\b(SEG|TER|QUA|QUI|SEX|SAB|DOM)\b([^A-ZÀ-Ú]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(seg[1]))) {
    const times = m[2].match(/\d{1,2}:\d{2}/g) || [];
    // pares (ENT/SAÍ) viram blocos: 8 horários = 4 blocos (cobrança), 4 = 2 blocos (adm)
    const blocks: string[] = [];
    for (let i = 0; i + 1 < times.length; i += 2) blocks.push(`${times[i]}-${times[i + 1]}`);
    res[m[1]] = blocks.length ? blocks.join(" ") : null; // sem horário = folga
  }
  return res;
}

/** Extrai a coluna PREVISTO da linha do dia: "20/05/2026 - QUA  08:00-12:00 13:00-18:00  08:05 (C)..." */
export function parsePrevisto(line: string): string | null {
  const m = line.match(
    /^\d{2}\/\d{2}\/\d{4}\s*-\s*[A-Z]{3}\s+((?:\d{1,2}:\d{2}-\d{1,2}:\d{2}\s*)+)/,
  );
  return m ? m[1].trim().replace(/\s+/g, " ") : null;
}

async function parsePdf(file: File): Promise<Employee[]> {
  const pdfjsLib = await import("pdfjs-dist");
  // O worker do pdf.js v4+ é um ES module, e o navegador só permite module
  // workers da MESMA origem — por isso ele é servido do próprio site
  // (copiado para /public no build) em vez de um CDN externo.
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    text += strings.join(" ") + "\n";
  }

  const employees: Employee[] = [];
  const blocks = text.split("NOME DO FUNCIONÁRIO:").slice(1);

  for (const block of blocks) {
    const nameMatch = block.match(/^\s*(.*?)\s+CPF DO FUNCIONÁRIO:/);
    const name = nameMatch ? nameMatch[1].trim() : "Desconhecido";
    const pisMatch = block.match(/PIS DO FUNCIONÁRIO:\s*([\d\.\-]+)/);
    const pis = pisMatch ? pisMatch[1].replace(/[^\d]/g, "") : "00000000000";
    const roleMatch = block.match(/NOME DO CARGO:\s*(.*?)\s+NOME DO DEPARTAMENTO:/);
    const role = roleMatch ? roleMatch[1].trim() : "COLABORADOR";
    const deptMatch = block.match(/NOME DO DEPARTAMENTO:\s*(.*?)\s+HORÁRIO DE TRABALHO/);
    const dept = deptMatch ? deptMatch[1].trim() : "GERAL";

    // horário real do funcionário, lido do cabeçalho do PDF (varia por dia da semana)
    const week = parseWeekSchedule(block);
    const weekDefault =
      week.SEG || week.TER || week.QUA || week.QUI || week.SEX || "08:00-12:00 13:00-18:00";

    const emp: Employee = {
      id: `emp-${generateId()}`,
      name, pis, cpf: "00000000000", role, department: dept,
      admissionDate: "2020-01-01",
      expectedSchedule: weekDefault,
      adherenceScore: 0, isDisqualified: false, records: []
    };

    const altIndex = block.indexOf("Alterações");
    if (altIndex !== -1) {
      const altText = block.slice(altIndex + "Alterações".length);
      const altLines = altText.split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.includes("TOTAIS") && !l.includes("BANCO DE HORAS") && !l.includes("Resumo") && !l.includes("Saldo") && !l.match(/^\d+:\d+/));
      
      if (altLines.length > 0) {
        emp.alterations = altLines.map(l => l.replace(/^[-•]\s*/, ""));
      }
    }

    const lines = block.split(/\n|(?=\d{2}\/\d{2}\/\d{4} - [A-Z]{3})/);
    for (const line of lines) {
      const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4}) - ([A-Z]{3})/);
      if (!dateMatch) continue;
      
      const rawDate = dateMatch[1];
      const formattedDate = `${rawDate.slice(6, 10)}-${rawDate.slice(3, 5)}-${rawDate.slice(0, 2)}`;
      
      let punches: (string | null)[] = [];
      let status: TimeRecord["status"] = ["Ok"];
      let justification: string | undefined;
      
      if (line.match(/Férias|Ferias/i)) {
        status = ["Férias"];
      } else if (line.includes("Folga")) {
        status = ["Folga"];
      } else if (line.match(/Atestado/i)) {
        status = ["Atestado Médico"];
      } else if (line.match(/FERIADO/i)) {
        status = ["Feriado"];
        const feriadoMatch = line.match(/Feriado:\s*([^\n]+)/i);
        if (feriadoMatch) {
          justification = feriadoMatch[0].trim();
        }
      } else {
        // todas as batidas do dia (só contam horários com flag "(C)", "(P)"… — assim
        // os totais no fim da linha, que vêm sem flag, não são confundidos com batida)
        const pMatch = line.match(/(\d{2}:\d{2})\s*\([A-Z]\)|\bFalta\b/gi) || [];
        const clean = (m?: string) => m ? (m.toLowerCase().includes("falta") ? null : m.slice(0, 5)) : null;
        punches = pMatch.map((p) => clean(p));
        
        if (line.match(/HOME OFFICE/i)) {
          status = ["Home Office"];
        } else if (line.match(/Abonar quantidade de horas|Ajuste quantidade de horas|ABONADO/i)) {
          status = ["Abonado"];
        } else if (line.match(/ANIVERS[AÁ]RIO/i)) {
          status = ["Aniversário"];
        } else if (line.match(/Licença Casamento/i)) {
          status = ["Licença Casamento"];
        } else if (line.match(/INSS/i)) {
          status = ["INSS"];
        } else if (line.match(/DECLARAÇ[AÃ]O/i)) {
          status = ["Declaração"];
        } else {
          const contentAfterDate = line.replace(/^(\d{2}\/\d{2}\/\d{4}) - ([A-Z]{3})\s*/, '').trim();
          if (!contentAfterDate || /^[- \t]+$/.test(contentAfterDate)) {
            status = ["Não Contabilizado"];
          }
        }
      }

      const dayOfWeek = getDayOfWeek(formattedDate);
      const isOff = status.includes("Folga") || status.includes("Feriado") || status.includes("Férias") || status.includes("Atestado Médico") || status.includes("Home Office") || status.includes("Abonado") || status.includes("Aniversário") || status.includes("Licença Casamento") || status.includes("Não Contabilizado") || status.includes("INSS") || status.includes("Declaração") || dayOfWeek === "SAB" || dayOfWeek === "DOM";

      // jornada do dia: PREVISTO da própria linha > tabela do cabeçalho > padrão
      const previsto = parsePrevisto(line);
      const schedOfDay = previsto ?? week[dayOfWeek] ?? emp.expectedSchedule;

      // a jornada diz quantas batidas o dia deveria ter (2 por bloco)
      const expectedPunches = (schedOfDay.match(/\d{1,2}:\d{2}/g) || []).length;
      if (expectedPunches && punches.length < expectedPunches) {
        punches = [...punches, ...Array(expectedPunches - punches.length).fill(null)];
      }

      emp.records.push({
        id: `rec-${generateId()}`,
        employeeId: emp.id,
        date: formattedDate,
        dayOfWeek,
        expectedSchedule: isOff ? "" : schedOfDay,
        punches,
        checkIn1: punches[0] ?? null, checkOut1: punches[1] ?? null,
        checkIn2: punches[2] ?? null, checkOut2: punches[3] ?? null,
        totalNormalHours: "", totalFaultDays: 0, delayAndFaultHours: "",
        excusedHours: "", overtime: "", bankBalance: "",
        status, adherencePercentage: 0, justification,
      });
    }

    if (emp.records.length > 0) {
      employees.push(emp);
    }
  }

  if (employees.length > 0) {
    localStorage.setItem("pc-employees", JSON.stringify(employees));
    window.dispatchEvent(new Event("pc-employees-change"));
    return employees;
  }
  
  throw new Error(`Nenhum dado válido encontrado no PDF. Preview do texto extraído: ${text.slice(0, 150)}`);
}

export async function parseFile(file: File): Promise<Employee[]> {
  if (file.name.toLowerCase().endsWith(".pdf")) {
    return parsePdf(file);
  }

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as any[];
          
          if (rows.length === 0) {
            return reject(new Error("O arquivo CSV está vazio ou inválido."));
          }

          const employeesMap = new Map<string, Employee>();

          rows.forEach((row) => {
            const name = row["Nome"] || row["Name"] || row["Funcionario"] || "Desconhecido";
            const pis = row["PIS"] || "00000000000";
            const cpf = row["CPF"] || "00000000000";
            const empId = pis !== "00000000000" ? pis : name;
            
            if (!employeesMap.has(empId)) {
              employeesMap.set(empId, {
                id: `emp-${generateId()}`,
                name: name.toUpperCase(),
                pis,
                cpf,
                role: row["Cargo"] || row["Role"] || "COLABORADOR",
                department: row["Departamento"] || row["Department"] || "GERAL",
                admissionDate: "2020-01-01",
                expectedSchedule: "08:00-12:00 13:00-18:00",
                adherenceScore: 0,
                isDisqualified: false,
                records: [],
              });
            }

            const emp = employeesMap.get(empId)!;

            // Date parsing
            let rawDate = row["Data"] || row["Date"];
            let formattedDate = "2024-01-01";
            if (rawDate) {
              if (rawDate.includes("/")) {
                const parts = rawDate.split("/");
                if (parts[2].length === 4) {
                  // DD/MM/YYYY
                  formattedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
                } else if (parts[0].length === 4) {
                  // YYYY/MM/DD
                  formattedDate = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
                }
              } else if (rawDate.includes("-")) {
                formattedDate = rawDate;
              }
            }

            const in1 = row["Entrada 1"] || row["In1"] || row["Entrada"] || null;
            const out1 = row["Saida 1"] || row["Saída 1"] || row["Out1"] || row["Saida"] || null;
            const in2 = row["Entrada 2"] || row["In2"] || null;
            const out2 = row["Saida 2"] || row["Saída 2"] || row["Out2"] || null;

              const dayOfWeek = getDayOfWeek(formattedDate);
              const isOff = dayOfWeek === "SAB" || dayOfWeek === "DOM";
              
              const record: TimeRecord = {
                id: `rec-${generateId()}`,
                employeeId: emp.id,
                date: formattedDate,
                dayOfWeek,
                expectedSchedule: isOff ? "" : emp.expectedSchedule,
              punches: [in1, out1, in2, out2],
              checkIn1: in1,
              checkOut1: out1,
              checkIn2: in2,
              checkOut2: out2,
              totalNormalHours: "",
              totalFaultDays: 0,
              delayAndFaultHours: "",
              excusedHours: "",
              overtime: "",
              bankBalance: "",
              status: ["Ok"],
              adherencePercentage: 0,
            };

            emp.records.push(record);
          });

          const employees = Array.from(employeesMap.values());
          
          if (employees.length === 0) {
             return reject(new Error("Nenhum dado encontrado no CSV."));
          }
          
          // Sort records by date
          employees.forEach(e => {
            e.records.sort((a, b) => a.date.localeCompare(b.date));
          });

          localStorage.setItem("pc-employees", JSON.stringify(employees));
          window.dispatchEvent(new Event("pc-employees-change"));
          resolve(employees);
        } catch (error) {
          console.error("Parse error:", error);
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}
