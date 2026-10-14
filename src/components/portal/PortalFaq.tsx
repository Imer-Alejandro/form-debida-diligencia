"use client";

import { useState } from "react";

export function PortalFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "¿Cuánto tiempo toma la evaluación de debida diligencia?",
      a: "El tiempo habitual de evaluación es de 3 a 5 días laborables tras la recepción de la totalidad de documentos requeridos y la firma digital. Puede consultar el avance en tiempo real en este portal con su RNC o N° de Referencia.",
    },
    {
      q: "¿Qué ocurre si recibo un estado de 'Solicitud de Cambios'?",
      a: "Significa que el oficial de cumplimiento necesita una corrección o documento adicional. Al ingresar con su enlace, verá detalladas las instrucciones específicas del evaluador y podrá adjuntar los recaudos faltantes para reenviar la solicitud.",
    },
    {
      q: "¿Por qué se solicita información de Beneficiario Final y Estados Financieros?",
      a: "En estricto cumplimiento de la Ley 155-17 contra el Lavado de Activos y Financiamiento del Terrorismo en la República Dominicana y las políticas de gobierno corporativo de Sánchez Business & Corp., es obligatorio verificar la titularidad societaria y la solvencia fiscal de nuestros proveedores.",
    },
    {
      q: "¿Cómo se protegen los datos y documentos adjuntos?",
      a: "Toda la comunicación está protegida por cifrado SSL/TLS de 256 bits y los archivos se custodian de forma privada en el repositorio corporativo de Microsoft SharePoint de Sánchez Business & Corp., con acceso restringido únicamente al personal autorizado de cumplimiento.",
    },
    {
      q: "¿Cómo sé cuándo mi homologación está aprobada y lista para compras?",
      a: "Al concluir satisfactoriamente el dictamen, su estado en este portal cambiará a 'Proveedor Homologado y Vigente', y recibirá por correo electrónico la notificación formal de alta para contrataciones y órdenes de compra.",
    },
  ];

  return (
    <section className="py-12 border-t border-slate-200/80">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Preguntas Frecuentes
          </span>
          <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            Todo lo que Necesita Saber sobre el Proceso
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left font-display text-sm font-semibold text-slate-900 hover:text-navy-900 transition-colors"
                >
                  <span>{f.q}</span>
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs text-slate-600 transition-transform ${
                      isOpen ? "rotate-180 bg-navy-900 text-white" : ""
                    }`}
                  >
                    ▼
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 bg-[#f8fafc] px-5 py-4 text-xs leading-relaxed text-slate-600 animate-in fade-in duration-150">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
