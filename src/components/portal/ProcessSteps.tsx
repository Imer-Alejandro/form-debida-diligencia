"use client";

import Link from "next/link";

interface ProcessStepsProps {
  onOpenStartModal: () => void;
  onOpenRequirementsModal: () => void;
}

export function ProcessSteps({
  onOpenStartModal,
  onOpenRequirementsModal,
}: ProcessStepsProps) {
  const steps = [
    {
      num: "01",
      title: "Invitación y Acceso Seguro",
      desc: "El área de compras genera y remite un enlace cifrado único. No requiere crear contraseñas complicadas ni cuentas externas.",
      tag: "Acceso Seguro",
    },
    {
      num: "02",
      title: "Cuestionario y Carga Documental",
      desc: "Diligencie sus datos fiscales, bancarios y adjunte sus recaudos en formato PDF. Guardado automático progresivo.",
      tag: "Cifrado SharePoint",
    },
    {
      num: "03",
      title: "Declaración Jurada y Firma Digital",
      desc: "Declare la veracidad de la información y firme directamente en pantalla desde su computadora, tablet o teléfono móvil.",
      tag: "Firma Electrónica",
    },
    {
      num: "04",
      title: "Dictamen de Debida Diligencia",
      desc: "El Oficial de Cumplimiento valida listas restrictivas, antecedentes y solvencia fiscal, emitiendo la homologación oficial.",
      tag: "Homologación",
    },
  ];

  return (
    <section className="py-12 sm:py-16">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
            Flujo de Homologación Corporativa
          </span>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Proceso de Debida Diligencia Paso a Paso
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-xl">
            Un procedimiento ágil y confidencial diseñado conforme a las mejores prácticas de gobierno corporativo y la Ley 155-17.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenRequirementsModal}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            Ver Requisitos Requeridos
          </button>
          <button
            type="button"
            onClick={onOpenStartModal}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-900 px-5 text-xs font-semibold text-white shadow-xs hover:bg-navy-800 transition-colors"
          >
            Iniciar Formulario →
          </button>
        </div>
      </div>

      {/* Grid styled after Reference Image 3 (01, 02, 03, 04 with vertical lines and corporate styling) */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, idx) => (
          <div
            key={idx}
            className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs hover:shadow-md transition-shadow"
          >
            {/* Top number & accent line */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl font-extrabold tracking-tight text-navy-900">
                {s.num}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                {s.tag}
              </span>
            </div>

            {/* Accent colored line */}
            <div className="mt-3 h-1 w-10 bg-teal-600 rounded-full" />

            <h3 className="mt-4 font-display text-base font-bold text-slate-900">
              {s.title}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
