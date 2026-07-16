"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn, AlertTriangle, Clock, BarChart3 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Já logado? vai direto pro dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!user.trim() || !senha) {
      setErro("Informe e-mail e senha.");
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: user.trim(),
      password: senha,
    });

    if (error) {
      setErro("E-mail ou senha inválidos.");
      setCarregando(false);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <div className="login-wrap">
      {carregando && (
        <div className="session-overlay anim-in">
          <div className="flex flex-col items-center gap-4">
            <div className="pc-spinner pc-spinner-lg" />
            <span className="text-sm text-muted font-medium">Entrando…</span>
          </div>
        </div>
      )}

      <div className="absolute top-5 right-6 z-30">
        <ThemeToggle />
      </div>

      {/* Painel de marca (esquerda) */}
      <aside className="login-brand-side">
        <div className="flex flex-col items-center gap-6 max-w-[460px] text-center anim-up">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo.svg`} alt="PointControl" className="w-14 h-14 rounded-2xl shadow-[var(--sh)]" />
            <div className="text-left">
              <div className="text-2xl font-extrabold tracking-tight">
                Point<span className="text-brand">Control</span>
              </div>
              <div className="text-xs text-muted-2 font-medium">Aderência · Assiduidade · Premiação</div>
            </div>
          </div>

          <div className="anim-float mt-2" style={{ animation: "floaty 6s ease-in-out infinite" }}>
            <div className="card p-6 w-[360px] shadow-[var(--sh-lg)] text-left">
              <div className="flex items-center justify-between mb-4">
                <span className="chip"><BarChart3 className="w-3.5 h-3.5" /> Aderência média</span>
                <span className="text-xs text-muted-2">Junho</span>
              </div>
              <div className="text-4xl font-black tracking-tighter text-ink">96,4%</div>
              <div className="mt-4 flex items-end gap-1.5 h-16">
                {[60, 80, 45, 92, 70, 100, 88].map((h, i) => (
                  <div key={i} className="flex-1 rounded-md origin-bottom"
                       style={{
                         height: `${h}%`,
                         background: "linear-gradient(180deg, var(--color-brand-400), var(--color-brand))",
                         animation: `riseBar 0.6s var(--spring) ${i * 0.07}s both`,
                       }} />
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-line-2 flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-brand" />
                <span className="text-ink-2 font-medium">Atrasos e faltas monitorados</span>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <h2 className="text-2xl font-extrabold text-ink">Controle de ponto inteligente</h2>
            <p className="text-[15px] text-muted leading-relaxed mt-2">
              Leia os relatórios de ponto, calcule a aderência à jornada automaticamente
              e acompanhe atrasos, faltas e divergências de cada colaborador em um só lugar.
            </p>
          </div>
        </div>
      </aside>

      {/* Acesso (direita) */}
      <main className="login-access">
        <div className="login-card anim-up" style={{ animationDelay: "0.08s" }}>
          <div className="flex items-center gap-3 mb-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo.svg`} alt="PointControl" className="w-12 h-12 rounded-xl shadow-[var(--sh-sm)]" />
            <div>
              <div className="text-xl font-extrabold tracking-tight">Área de login</div>
              <div className="text-[12.5px] text-muted">Acesso à plataforma</div>
            </div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="login-field">
              <Mail className="w-4 h-4" />
              <input type="email" value={user} onChange={(e) => setUser(e.target.value)} placeholder="E-mail" autoFocus autoComplete="username" />
            </label>
            <label className="login-field">
              <Lock className="w-4 h-4" />
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha" autoComplete="current-password" />
            </label>

            {erro && (
              <div className="flex items-center gap-2 text-sm text-bad rounded-lg px-3 py-2.5"
                   style={{ background: "var(--color-bad-soft)", border: "1px solid #f6c6c3" }}>
                <AlertTriangle className="w-4 h-4" /> {erro}
              </div>
            )}

            <button className="btn w-full mt-1" disabled={carregando}>
              {carregando ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white spin-ic" /> : <LogIn className="w-4 h-4" />}
              {carregando ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <p className="mt-5 text-xs text-muted-2 text-center leading-relaxed">
            Acesso restrito e monitorado. Ferramenta de apoio à gestão de ponto —
            uso conforme a LGPD.
          </p>
        </div>
      </main>
    </div>
  );
}
