import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portal de Proveedores | Sanchez Business Corp",
  description:
    "Registro y debida diligencia de proveedores de Sanchez Business Corp (República Dominicana).",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const store = await cookies();
  const lang = store.get("sb_lang")?.value === "en" ? "en" : "es";

  return (
    <html lang={lang} className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider initialLang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}