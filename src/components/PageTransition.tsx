"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBusy(true);
    const t = setTimeout(() => setBusy(false), 440);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div className="relative min-h-[70vh]">
      {/* barra de progresso no topo */}
      <AnimatePresence>
        {busy && (
          <motion.div
            key="bar"
            className="route-bar"
            initial={{ width: "0%", opacity: 1 }}
            animate={{ width: "90%" }}
            exit={{ width: "100%", opacity: 0 }}
            transition={{ width: { duration: 0.55, ease: "easeOut" }, opacity: { duration: 0.2 } }}
          />
        )}
      </AnimatePresence>

      {/* tela de carregamento sobre o conteúdo */}
      <AnimatePresence>
        {busy && (
          <motion.div
            key="overlay"
            className="route-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="pc-spinner" />
              <span className="text-sm text-muted font-medium">Carregando…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* conteúdo com fade de entrada por rota */}
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.14, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
