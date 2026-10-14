"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { useI18n, useDict } from "@/lib/i18n";

interface RequirementsModalProps {
  open: boolean;
  onClose: () => void;
}

export function RequirementsModal({ open, onClose }: RequirementsModalProps) {
  const [tab, setTab] = useState<"juridica" | "fisica" | "extranjera" | "contratista">("juridica");
  const { lang } = useI18n();
  const dict = useDict();
  const m = dict.portal.modals;

  const categories = {
    juridica: [
      {
        name: lang === "es" ? "Registro Mercantil Vigente" : "Active Commercial Registry",
        desc: lang === "es"
          ? "Expedido por la Cámara de Comercio correspondiente, debidamente renovado."
          : "Issued by the relevant Chamber of Commerce, duly renewed.",
        format: lang === "es" ? "PDF original o escaneado legible" : "Legible scanned or original PDF",
        ref: "Ref. B",
      },
      {
        name: lang === "es" ? "Copia del RNC (DGII)" : "Tax ID Certificate (DGII RNC)",
        desc: lang === "es"
          ? "Comprobante de inscripción en el Registro Nacional de Contribuyentes emitido por la DGII."
          : "Proof of enrollment in the National Taxpayers Registry issued by DGII.",
        format: "PDF DGII",
        ref: "Ref. C",
      },
      {
        name: lang === "es" ? "Certificación de Impuestos al Día (DGII)" : "Tax Compliance Certificate (DGII)",
        desc: lang === "es"
          ? "Certificado oficial de cumplimiento tributario con fecha de emisión no mayor a 30 días."
          : "Official tax clearance certificate issued within the last 30 days.",
        format: "PDF",
        ref: "Ref. D",
      },
      {
        name: lang === "es" ? "Certificación de la TSS al Día" : "Social Security Clearance (TSS)",
        desc: lang === "es"
          ? "Certificado de cumplimiento de pagos de la Tesorería de la Seguridad Social."
          : "Certificate of payment compliance from the Social Security Treasury.",
        format: "PDF TSS",
        ref: "Ref. E",
      },
      {
        name: lang === "es" ? "Cédula o Pasaporte de Accionistas y Beneficiarios" : "ID or Passport of Shareholders & UBOs",
        desc: lang === "es"
          ? "Documento de identidad de personas físicas con más del 10% de participación accionaria."
          : "Identity document of natural persons holding more than 10% equity interest.",
        format: "PDF",
        ref: "Ref. F",
      },
      {
        name: lang === "es" ? "Cédula o Pasaporte del Representante Legal" : "ID or Passport of Legal Representative",
        desc: lang === "es"
          ? "Identificación oficial del firmante o apoderado legal que suscribe el formulario."
          : "Official ID of the legal representative or manager executing the form.",
        format: "PDF",
        ref: "Ref. G",
      },
      {
        name: lang === "es" ? "Estados Financieros (Últimos 2 Ejercicios)" : "Financial Statements (Last 2 Fiscal Years)",
        desc: lang === "es"
          ? "Balance General y Estado de Resultados, firmados por CPA o auditados."
          : "Balance Sheet and Income Statement, signed by CPA or audited.",
        format: "PDF",
        ref: "Ref. H",
      },
      {
        name: lang === "es" ? "Certificación Bancaria Oficial" : "Official Banking Reference Letter",
        desc: lang === "es"
          ? "Carta emitida por su entidad bancaria con datos para transferencias (a nombre de la empresa)."
          : "Letter issued by your bank detailing transfer coordinates (in the company's name).",
        format: "PDF",
        ref: "Ref. J",
      },
    ],
    fisica: [
      {
        name: lang === "es" ? "Cédula de Identidad y Electoral" : "National Identity Card / ID",
        desc: lang === "es"
          ? "Documento oficial del titular persona física, legible por ambas caras."
          : "Official identity card of the individual provider, both sides.",
        format: "PDF",
        ref: "Ref. G",
      },
      {
        name: lang === "es" ? "Copia del RNC Persona Física" : "Individual Tax ID (RNC)",
        desc: lang === "es"
          ? "Constancia de inscripción ante la DGII como persona física contribuyente."
          : "Proof of registration with DGII as an individual taxpayer.",
        format: "PDF",
        ref: "Ref. C",
      },
      {
        name: lang === "es" ? "Certificación de Impuestos al Día (DGII)" : "Tax Compliance Certificate (DGII)",
        desc: lang === "es"
          ? "Certificado oficial tributario vigente no mayor a 30 días."
          : "Current tax compliance certificate within 30 days.",
        format: "PDF",
        ref: "Ref. D",
      },
      {
        name: lang === "es" ? "Certificación Bancaria" : "Bank Reference Letter",
        desc: lang === "es"
          ? "Carta bancaria donde conste el titular y número de cuenta para depósitos."
          : "Bank letter confirming account holder and deposit account number.",
        format: "PDF",
        ref: "Ref. J",
      },
      {
        name: lang === "es" ? "Curriculum / Portafolio de Servicios" : "Resume / Services Portfolio",
        desc: lang === "es"
          ? "Resumen de trayectoria y principales clientes o proyectos atendidos."
          : "Summary of experience, key projects and past clients.",
        format: "PDF",
        ref: "Ref. L",
      },
    ],
    extranjera: [
      {
        name: lang === "es" ? "Certificado de Incorporación / Registro Comercial" : "Certificate of Incorporation / Good Standing",
        desc: lang === "es"
          ? "Certificate of Incorporation / Good Standing emitido por la autoridad mercantil de su país."
          : "Certificate of Incorporation or Good Standing issued by relevant authority in country of origin.",
        format: "PDF",
        ref: "Ref. B",
      },
      {
        name: lang === "es" ? "Número de Identificación Fiscal (Tax ID / W-8 / W-9)" : "Tax ID Number (W-8 / W-9 / EIN)",
        desc: lang === "es"
          ? "Constancia de registro tributario en el país de origen (EIN, NIF, CIF, etc.)."
          : "Proof of tax registration in country of origin (EIN, TIN, VAT, etc.).",
        format: "PDF",
        ref: "Ref. O",
      },
      {
        name: lang === "es" ? "Pasaporte del Representante Legal" : "Passport of Legal Representative",
        desc: lang === "es"
          ? "Copia legible de la página biográfica del pasaporte vigente."
          : "Legible copy of the biographical page of valid passport.",
        format: "PDF",
        ref: "Ref. G",
      },
      {
        name: lang === "es" ? "Carta de Instrucciones Bancarias Internacionales" : "International Wire Instructions Letter",
        desc: lang === "es"
          ? "Datos SWIFT/BIC, IBAN o ABA de la cuenta bancaria corporativa."
          : "SWIFT/BIC, IBAN or ABA coordinates of corporate bank account.",
        format: "PDF",
        ref: "Ref. J",
      },
    ],
    contratista: [
      {
        name: lang === "es" ? "Póliza de Responsabilidad Civil General / CAR" : "General Liability / CAR Insurance Policy",
        desc: lang === "es"
          ? "Póliza de cobertura por daños a terceros en obras, mantenimientos o servicios de campo."
          : "Third-party coverage policy for works, maintenance or on-site services.",
        format: "PDF",
        ref: "Ref. M",
      },
      {
        name: lang === "es" ? "Plan de Seguridad y Salud en el Trabajo" : "Occupational Health & Safety Plan",
        desc: lang === "es"
          ? "Documentación que acredite protocolos de EPP y cumplimiento de normativas laborales."
          : "Protocols verifying PPE and compliance with labor safety standards.",
        format: "PDF",
        ref: "Ref. P",
      },
      {
        name: lang === "es" ? "Requisitos Persona Jurídica / Física Completos" : "Full Entity / Individual Documents",
        desc: lang === "es"
          ? "Aplica toda la documentación fiscal, legal y bancaria correspondiente a su figura."
          : "All applicable tax, legal, and banking documentation for your entity type.",
        format: "PDF",
        ref: "Todos",
      },
    ],
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={m.reqTitle}
      maxWidth="max-w-3xl"
    >
      <div>
        <p className="text-xs text-slate-600 leading-relaxed">
          {m.reqIntro}
        </p>

        {/* Category Tabs */}
        <div className="mt-5 flex gap-1.5 overflow-x-auto border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setTab("juridica")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              tab === "juridica"
                ? "bg-navy-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {m.tabJuridica}
          </button>
          <button
            type="button"
            onClick={() => setTab("fisica")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              tab === "fisica"
                ? "bg-navy-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {m.tabFisica}
          </button>
          <button
            type="button"
            onClick={() => setTab("extranjera")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              tab === "extranjera"
                ? "bg-navy-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {m.tabExtranjera}
          </button>
          <button
            type="button"
            onClick={() => setTab("contratista")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              tab === "contratista"
                ? "bg-navy-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {m.tabContratista}
          </button>
        </div>

        {/* List of documents */}
        <div className="mt-5 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {categories[tab].map((doc, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between gap-4 rounded-xl border border-slate-200/80 bg-[#f8fafc] p-3.5 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-navy-900/10 text-navy-900 text-xs font-bold font-mono">
                  {idx + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold text-slate-900">
                      {doc.name}
                    </span>
                    <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-600">
                      {doc.ref}
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">
                    {doc.desc}
                  </p>
                </div>
              </div>

              <span className="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 hidden sm:inline-block">
                {doc.format}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-[11px] text-slate-400">
            {m.custodyNote}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            {m.understood}
          </button>
        </div>
      </div>
    </Modal>
  );
}
