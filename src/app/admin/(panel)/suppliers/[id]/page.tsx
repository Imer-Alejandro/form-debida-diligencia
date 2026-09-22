import Link from "next/link";
import { getAdminSession } from "@/lib/supabase/auth";
import type { DocumentRow, RegistrationRow } from "@/lib/types";
import { SupplierDetail } from "@/components/admin/SupplierDetail";

export const dynamic = "force-dynamic";

export default async function AdminSupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getAdminSession();

  const { data: reg } = await supabase
    .from("supplier_registrations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { data: docs } = await supabase
    .from("registration_documents")
    .select("id, ref, file_name, file_size, mime_type, url, created_at")
    .eq("registration_id", id)
    .order("created_at", { ascending: true });

  if (!reg) {
    return (
      <div>
        <Link
          href="/admin/suppliers"
          className="text-[13px] text-ink-muted underline underline-offset-2 hover:text-navy-700"
        >
          ← Volver a la lista
        </Link>
        <p className="mt-6 rounded-2xl border border-navy-800/10 bg-white px-6 py-12 text-center text-sm text-ink-muted">
          Registro no encontrado.
        </p>
      </div>
    );
  }

  return (
    <SupplierDetail
      reg={reg as RegistrationRow}
      docs={(docs ?? []) as DocumentRow[]}
    />
  );
}