"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal, Input, Button } from "@/components/ui";

interface StartFormModalProps {
  open: boolean;
  onClose: () => void;
}

function extractToken(input: string): string | null {
  const s = input.trim();
  const urlMatch = s.match(/\/i\/([A-Za-z0-9]+)/);
  const candidate = (urlMatch ? urlMatch[1] : s).toUpperCase();
  return /^[A-Z0-9]{8,}$/.test(candidate) ? candidate : null;
}

export function StartFormModal({ open, onClose }: StartFormModalProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(false);
    const token = extractToken(value);
    if (!token) {
      setError(true);
      return;
    }
    setLoading(true);
    router.push(`/i/${token}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Acceso al Formulario de Proveedor"
      maxWidth="max-w-lg"
    >
      <div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Para acceder a su formulario cifrado de debida diligencia, introduzca el enlace o el código de invitación recibido en el correo electrónico enviado por Sánchez Business &amp; Corp.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              Enlace o Código de Invitación
            </span>
            <Input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(false);
              }}
              placeholder="Pegue aquí el enlace o código (ej. GZP4VPDK...)"
              invalid={error}
              autoComplete="off"
              autoFocus
            />
          </label>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 leading-relaxed">
              El código o enlace no tiene un formato válido. Revise el correo enviado por Sánchez Business &amp; Corp. o pegue la URL completa.
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Accediendo…" : "Acceder a Mi Formulario →"}
          </Button>
        </form>

        <div className="mt-6 rounded-xl border border-slate-100 bg-[#f8fafc] p-3.5 text-xs text-slate-500">
          <span className="font-semibold text-slate-700 block mb-1">
            ¿Aún no ha recibido una invitación?
          </span>
          Para iniciar el proceso de debida diligencia debe ser postulado por su contacto comercial o escribir a{" "}
          <a
            href="mailto:compras@sanchezbusinesscorp.com"
            className="font-medium text-navy-800 underline hover:text-navy-900"
          >
            compras@sanchezbusinesscorp.com
          </a>.
        </div>
      </div>
    </Modal>
  );
}
