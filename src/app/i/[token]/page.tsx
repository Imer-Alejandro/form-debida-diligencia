import { Suspense } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import { emptyData, type RegistrationRow, type SupplierData } from "@/lib/types";
import { SupplierWizard } from "@/components/wizard/SupplierWizard";
import { WizardShell } from "@/components/wizard/WizardShell";

export const dynamic = "force-dynamic";

async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const supabase = createPublicClient();
  const { data: inv } = await supabase
    .from("invitations")
    .select("token, supplier_name, supplier_email, status, expires_at, language")
    .eq("token", token)
    .maybeSingle();

  let prefill: SupplierData | null = null;
  let registration: RegistrationRow | null = null;

  if (inv) {
    const { data } = await supabase.rpc("get_registration_for_token", {
      p_token: token,
    });
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    registration = (rows[0] as RegistrationRow) ?? null;
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
            Solicítelo nuevamente a su contacto en Sanchez Business Corp.
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
      <SupplierWizard
        token={token}
        initial={prefill}
        registration={registration}
        lang={(inv?.language ?? "es") as "es" | "en"}
      />
    </Suspense>
  );
}

export default InvitationPage;