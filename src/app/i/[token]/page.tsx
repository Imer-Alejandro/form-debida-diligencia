import { Suspense } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import { emptyData, type RegistrationRow, type SupplierData } from "@/lib/types";
import { SupplierWizard } from "@/components/wizard/SupplierWizard";
import { WizardShell } from "@/components/wizard/WizardShell";

export const dynamic = "force-dynamic";

async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const supabase = createPublicClient();
  const { data: invitationData } = await supabase
    .rpc("get_invitation_for_token", { p_token: token })
    .maybeSingle();
  const inv = invitationData as {
    token: string;
    supplier_name: string | null;
    supplier_email: string | null;
    status: string;
    expires_at: string | null;
    language: string;
  } | null;

  let prefill: SupplierData | null = null;
  let registration: RegistrationRow | null = null;
  let requestNote: string | null = null;
  let requestNoteUnavailable = false;

  if (inv) {
    const { data } = await supabase.rpc("get_registration_for_token", {
      p_token: token,
    });
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    registration = (rows[0] as RegistrationRow) ?? null;

    if (registration?.status === "SOLICITUD_CAMBIOS") {
      const { data: status, error } = await supabase.rpc("get_portal_status", {
        p_query: token,
      });
      if (error) {
        console.error("Could not load supplier change-request notes", error);
        requestNoteUnavailable = true;
      } else {
        requestNote = typeof status?.note === "string" ? status.note : null;
      }
    }
  }

  // A brand-new supplier (no registration yet) can always start; otherwise only
  // drafts and rows opened for resubmission are editable.
  const editable =
    !registration ||
    registration.status === "BORRADOR" ||
    registration.status === "SOLICITUD_CAMBIOS";

  if (!inv) {
    return (
      <WizardShell>
        <div className="rounded-2xl border border-danger/20 bg-white p-8 text-center">
          <p className="font-display text-xl">Enlace no válido o expirado</p>
          <p className="mt-2 text-sm text-ink-muted">
            Solicítelo nuevamente a su contacto en Sánchez Business & Corp.
          </p>
        </div>
      </WizardShell>
    );
  }

  if (registration && editable) {
    prefill = (registration.data as SupplierData) ?? emptyData();
  }

  return (
    <Suspense fallback={null}>
      <div className="min-h-screen bg-bone-50">
        <div className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-12">
          <SupplierWizard
            token={token}
            initial={prefill}
            registration={registration}
            requestNote={requestNote}
            requestNoteUnavailable={requestNoteUnavailable}
            lang={(inv?.language ?? "es") as "es" | "en"}
          />
        </div>
      </div>
    </Suspense>
  );
}

export default InvitationPage;