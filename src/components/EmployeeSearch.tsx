"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useEmployees } from "@/lib/useEmployees";
import { fmtName, initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface EmployeeSearchProps {
  className?: string;
  size?: "lg" | "md";
  autoFocus?: boolean;
}

export default function EmployeeSearch({ className, size = "md", autoFocus = false }: EmployeeSearchProps) {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const employees = useEmployees();

  const results = search.trim().length >= 2
    ? employees.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
    : [];

  const sizeClasses = size === "lg" 
    ? "px-5 py-4 text-lg rounded-2xl shadow-[var(--sh-md)]" 
    : "px-3 py-2 text-sm rounded-xl";
    
  const iconSize = size === "lg" ? "w-5 h-5" : "w-4 h-4";

  return (
    <div className={cn("relative w-full max-w-lg", className)}>
      <div className={cn("flex items-center gap-2 border border-line bg-surface-2 text-muted-2 transition-all focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20", sizeClasses)}>
        <Search className={iconSize} />
        <input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Buscar colaborador…" 
          className="bg-transparent outline-none text-ink w-full placeholder:text-muted-2" 
          autoFocus={autoFocus}
        />
      </div>
      {search.trim().length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-surface border border-line rounded-xl shadow-[var(--sh-lg)] p-1 z-50">
          {results.length > 0 ? (
            results.map((emp) => (
              <button 
                key={emp.id} 
                onClick={() => { setSearch(""); router.push(`/colaborador/${emp.id}`); }} 
                className="w-full text-left px-3 py-3 rounded-lg hover:bg-surface-2 transition-colors text-sm text-ink flex items-center gap-3"
              >
                <div className="w-8 h-8 flex-none rounded-md bg-brand-50 text-brand grid place-items-center text-xs font-bold">{initials(emp.name)}</div>
                <div className="min-w-0">
                   <div className="truncate font-semibold">{fmtName(emp.name)}</div>
                   <div className="text-[11px] text-muted-2">{emp.department}</div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-6 text-sm text-muted text-center">Nenhum colaborador encontrado.</div>
          )}
        </div>
      )}
    </div>
  );
}
