"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Protege a área logada: sem sessão válida no Supabase, volta para o login.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checando, setChecando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    let vivo = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!vivo) return;
      if (data.session) {
        setAutorizado(true);
      } else {
        router.replace("/");
      }
      setChecando(false);
    })();

    // Se a sessão cair (logout / expiração), volta pro login
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!vivo) return;
      if (!session) {
        setAutorizado(false);
        router.replace("/");
      } else {
        setAutorizado(true);
      }
    });

    return () => {
      vivo = false;
      listener?.subscription?.unsubscribe();
    };
  }, [router]);

  if (checando) {
    return (
      <div className="session-overlay">
        <div className="flex flex-col items-center gap-4">
          <div className="pc-spinner pc-spinner-lg" />
          <span className="text-sm text-muted font-medium">Verificando acesso…</span>
        </div>
      </div>
    );
  }

  if (!autorizado) return null;

  return <>{children}</>;
}
