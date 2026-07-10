"use client";

import { UploadCloud, FileText, CheckCircle2, FileSpreadsheet, FileCode2, RotateCcw, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { parseFile } from "@/lib/parser";
import { useToast } from "@/components/ToastContext";

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      await parseFile(file);
      setUploaded(true);
      toast("Arquivo processado!", { description: "Os dados de ponto foram importados com sucesso.", type: "success" });
    } catch (error) {
      console.error("Failed to parse file", error);
      toast("Falha na importação", { description: "O formato do arquivo é inválido ou ocorreu um erro.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const formats = [
    { icon: FileText, label: "PDF", desc: "Extração via OCR inteligente", tone: "var(--color-brand)" },
    { icon: FileSpreadsheet, label: "CSV / Excel", desc: "Mapeamento direto de colunas", tone: "var(--color-good)" },
    { icon: FileCode2, label: "TXT / AFD", desc: "Padrão de REP de ponto", tone: "#7a5cc4" },
  ];

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-7 anim-up">
      <header className="text-center">

        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-ink">Ingestão de dados</h1>
        <p className="text-muted mt-1">Envie o relatório de ponto (CSV preferencialmente) gerado pelo seu sistema.</p>
      </header>

      <div
        className={cn(
          "card border-2 border-dashed rounded-3xl p-12 lg:p-16 flex flex-col items-center justify-center text-center transition-all duration-300",
        )}
        style={{
          borderColor: uploaded ? "#c5ebdd" : isDragging ? "var(--color-brand)" : "var(--color-line)",
          background: uploaded ? "var(--color-good-soft)" : isDragging ? "var(--color-brand-50)" : "var(--color-surface)",
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-4 anim-scale">
            <Loader2 className="w-12 h-12 text-brand animate-spin" />
            <h3 className="text-xl font-bold text-ink">Processando dados...</h3>
          </div>
        ) : uploaded ? (
          <div className="flex flex-col items-center gap-4 anim-scale">
            <div className="w-20 h-20 rounded-full grid place-items-center" style={{ background: "#fff", color: "var(--color-good)", border: "1px solid #c5ebdd" }}>
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-extrabold" style={{ color: "var(--color-good)" }}>Arquivo processado!</h3>
            <p className="text-muted max-w-sm">O relatório foi analisado e o dashboard já reflete os dados atualizados de aderência e ranking.</p>
            <button onClick={() => setUploaded(false)} className="btn btn-outline mt-2">
              <RotateCcw className="w-4 h-4" /> Fazer novo upload
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-full grid place-items-center bg-brand-50 text-brand">
              <UploadCloud className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink mb-1.5">Arraste seus relatórios para cá</h3>
              <p className="text-sm text-muted max-w-sm mx-auto">
                O sistema faz o parse inteligente detectando automaticamente colaboradores e jornadas.
              </p>
            </div>
            <label className="btn cursor-pointer">
              <UploadCloud className="w-4 h-4" /> Procurar arquivo
              <input type="file" className="hidden" accept=".csv,.pdf" onChange={onFileChange} />
            </label>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {formats.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.label} className="card card-hover p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl grid place-items-center flex-none" style={{ background: "var(--color-surface-2)", color: f.tone, border: "1px solid var(--color-line)" }}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-ink">{f.label}</h4>
                <p className="text-xs text-muted-2 mt-0.5">{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
