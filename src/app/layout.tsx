import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PointControl — Aderência & Gamificação",
  description: "Controle de ponto inteligente, aderência e ranking de assiduidade.",
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo.svg` },
};

const themeInit = `try{var t=localStorage.getItem('pc-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.dataset.theme='dark';}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${inter.className} min-h-screen`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
