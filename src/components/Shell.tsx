"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, Trophy, Users, UploadCloud, Menu, X, LogOut, Search, SlidersHorizontal,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import PageTransition from "@/components/PageTransition";
import { useToast } from "@/components/ToastContext";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, section: "Gestão" },
  { href: "/ranking", label: "Ranking", icon: Trophy, section: "Gestão" },
  { href: "/colaborador", label: "Espelho do Ponto", icon: Users, section: "Gestão", match: "/colaborador" },
  { href: "/upload", label: "Ingestão de Dados", icon: UploadCloud, section: "Dados" },
  { href: "/parametros", label: "Parâmetros", icon: SlidersHorizontal, section: "Dados" },
];

const CRUMB: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/ranking": "Ranking de Aderência",
  "/colaborador": "Espelho do Ponto",
  "/upload": "Ingestão de Dados",
  "/parametros": "Parâmetros de cálculo",
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const [lastClickTime, setLastClickTime] = useState(0);
  const [rapidClicks, setRapidClicks] = useState(0);

  const handleEggClick = () => {
    const now = Date.now();
    let newClicks = 1;
    
    if (now - lastClickTime < 1000) {
      newClicks = rapidClicks + 1;
    }
    
    setRapidClicks(newClicks);
    setLastClickTime(now);

    if (newClicks === 7) {
      toast("🎉 Uau, um easter egg!", { 
        description: "Você clicou tão rápido que destravou o segredo.",
        type: "achievement"
      });
      setRapidClicks(0);
    }
  };

  const isActive = (item: (typeof NAV)[number]) =>
    pathname === item.href || (item.match ? pathname.startsWith(item.match) : false);

  const crumb =
    Object.entries(CRUMB).find(([k]) => pathname.startsWith(k))?.[1] ?? "PointControl";

  function logout() {
    try { 
      sessionStorage.removeItem("pc-auth");
      sessionStorage.removeItem("pc-farm-open");
    } catch {}
    router.push("/");
  }

  const sections = ["Gestão", "Dados"];

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[var(--sidebar-w)_1fr] bg-bg">
      {/* ---------------- Sidebar ---------------- */}
      <aside className={`pc-sidebar bg-surface border-r border-line flex flex-col gap-5 p-4 lg:sticky lg:top-0 lg:h-screen w-[260px] ${open ? "open" : ""}`}>
        <div className="flex items-center justify-between px-2 pt-2">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo.svg`} alt="PointControl" className="w-10 h-10 shadow-[var(--sh-sm)] rounded-[11px]" />
            <div className="font-extrabold text-xl tracking-tight">
              Point<span className="text-brand">Control</span>
            </div>
          </Link>
          <button className="lg:hidden p-2 text-muted" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-4 mt-1">
          {sections.map((sec) => (
            <div key={sec} className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-muted-2 px-2 mb-1">{sec}</span>
              {NAV.filter((n) => n.section === sec).map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                        className={`nav-item ${isActive(item) ? "active" : ""}`}>
                    <Icon className="w-[18px] h-[18px]" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto px-2 relative">
          <button onClick={logout} className="nav-item w-full text-left" style={{ color: "var(--color-muted)" }}>
            <LogOut className="w-[18px] h-[18px]" />
            Sair
          </button>
          <p 
            onClick={handleEggClick}
            className="text-[11px] text-muted-2 leading-relaxed px-2 mt-3 pt-3 border-t border-line-2 select-none"
          >
            PointControl · MVP<br />Feito por: Emanuel Quintela
          </p>
        </div>
      </aside>

      {open && <div className="drawer-backdrop show lg:hidden" onClick={() => setOpen(false)} />}

      {/* ---------------- Conteúdo ---------------- */}
      <div className="flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 flex items-center justify-between gap-4 px-4 lg:px-8 bg-surface/90 backdrop-blur border-b border-line">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden p-2 rounded-lg border border-line text-ink-2" onClick={() => setOpen(true)} aria-label="Abrir menu">
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-xl grid place-items-center bg-brand-50 text-brand flex-none">
              <BarChart3 className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-[16px] text-ink leading-tight truncate">
                {crumb}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 w-full max-w-[1280px] mx-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
