"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";

interface RequirementsModalProps {
  open: boolean;
  onClose: () => void;
}

export function RequirementsModal({ open, onClose }: RequirementsModalProps) {
  const [tab, setTab] = useState<"juridica" | "fisica" | "extranjera" | "contratista">("juridica");

  const categories = {
    juridica: [
      {
        name: "Registro Mercantil Vigente",
        desc: "Expedido por la Cámara de Comercio correspondiente, debidamente renovado.",
        format: "PDF original o escaneado legible",
        ref: "Ref. B",
      },
      {
        name: "Copia del RNC (DGII)",
        desc: "Comprobante de inscripción en el Registro Nacional de Contribuyentes emitido por la DGII.",
        format: "PDF descargado de DGII",
        ref: "Ref. C",
      },
      {
        name: "Certificación de Impuestos al Día (DGII)",
        desc: "Certificado oficial de cumplimiento tributario con fecha de emisión no mayor a 30 días.",
        format: "PDF descargado con código de verificación",
        ref: "Ref. D",
      },
      {
        name: "Certificación de la TSS al Día",
        desc: "Certificado de cumplimiento de pagos de la Tesorería de la Seguridad Social.",
        format: "PDF con código QR o validación oficial",
        ref: "Ref. E",
      },
      {
        name: "Cédula o Pasaporte de Accionistas y Beneficiarios",
        desc: "Documento de identidad de personas físicas con más del 10% de participación accionaria.",
        format: "PDF por ambas caras",
        ref: "Ref. F",
      },
      {
        name: "Cédula o Pasaporte del Representante Legal",
        desc: "Identificación oficial del firmante o apoderado legal que suscribe el formulario.",
        format: "PDF por ambas caras",
        ref: "Ref. G",
      },
      {
        name: "Estados Financieros (Últimos 2 Ejercicios)",
        desc: "Balance General y Estado de Resultados, firmados por CPA o auditados.",
        format: "PDF completo",
        ref: "Ref. H",
      },
      {
        name: "Certificación Bancaria Oficial",
        desc: "Carta emitida por su entidad bancaria con datos para transferencias (a nombre de la empresa).",
        format: "PDF oficial membretado",
        ref: "Ref. J",
      },
    ],
    fisica: [
      {
        name: "Cédula de Identidad y Electoral",
        desc: "Documento oficial del titular persona física, legible por ambas caras.",
        format: "PDF escaneado",
        ref: "Ref. G",
      },
      {
        name: "Copia del RNC Persona Física",
        desc: "Constancia de inscripción ante la DGII como persona física contribuyente.",
        format: "PDF emitido por DGII",
        ref: "Ref. C",
      },
      {
        name: "Certificación de Impuestos al Día (DGII)",
        desc: "Certificado oficial tributario vigente no mayor a 30 días.",
        format: "PDF con código de validación",
        ref: "Ref. D",
      },
      {
        name: "Certificación Bancaria",
        desc: "Carta bancaria donde conste el titular y número de cuenta para depósitos.",
        format: "PDF membretado del banco",
        ref: "Ref. J",
      },
      {
        name: "Curriculum / Portafolio de Servicios",
        desc: "Resumen de trayectoria y principales clientes o proyectos atendidos.",
        format: "PDF",
        ref: "Ref. L",
      },
    ],
    extranjera: [
      {
        name: "Certificado de Incorporación / Registro Comercial",
        desc: "Certificate of Incorporation / Good Standing emitido por la autoridad mercantil de su país.",
        format: "PDF apostillado o legalizado",
        ref: "Ref. B",
      },
      {
        name: "Número de Identificación Fiscal (Tax ID / W-8 / W-9)",
        desc: "Constancia de registro tributario en el país de origen (EIN, NIF, CIF, etc.).",
        format: "PDF",
        ref: "Ref. O",
      },
      {
        name: "Pasaporte del Representante Legal",
        desc: "Copia legible de la página biográfica del pasaporte vigente.",
        format: "PDF legible",
        ref: "Ref. G",
      },
      {
        name: "Carta de Instrucciones Bancarias Internacionales",
        desc: "Datos SWIFT/BIC, IBAN o ABA de la cuenta bancaria corporativa.",
        format: "PDF membretado bancario",
        ref: "Ref. J",
      },
    ],
    contratista: [
      {
        name: "Póliza de Responsabilidad Civil General / CAR",
        desc: "Póliza de cobertura por daños a terceros en obras, mantenimientos o servicios de campo.",
        format: "PDF con recibo de pago o vigencia",
        ref: "Ref. M",
      },
      {
        name: "Plan de Seguridad y Salud en el Trabajo",
        desc: "Documentación que acredite protocolos de EPP y cumplimiento de normativas laborales.",
        format: "PDF",
        ref: "Ref. P",
      },
      {
        name: "Requisitos Persona Jurídica / Física Completos",
        desc: "Aplica toda la documentación fiscal, legal y bancaria correspondiente a su figura.",
        format: "PDFs según checklist",
        ref: "Todos",
      },
    ],
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Guía Oficial de Requisitos y Documentación"
      maxWidth="max-w-3xl"
    >
      <div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Para garantizar una homologación exitosa y sin demoras, prepare sus documentos en formato{" "}
          <strong className="text-slate-800">PDF legible (máximo 25 MB por archivo)</strong>.
          La debida diligencia de Sánchez Business & Corp. se ejecuta conforme a la Ley 155-17.
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
            Persona Jurídica (Rep. Dom.)
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
            Persona Física (Profesional)
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
            Empresa Internacional
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
            Contratistas de Obra
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
            Los documentos se custodian en el repositorio corporativo seguro de Sánchez Business &amp; Corp.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Entendido
          </button>
        </div>
      </div>
    </Modal>
  );
}
