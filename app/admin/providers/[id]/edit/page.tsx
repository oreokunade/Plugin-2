import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/Header";
import { getProviderById } from "../../actions";
import EditProviderForm from "./EditProviderForm";

export default async function EditProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const provider = await getProviderById(id);
  if (!provider) notFound();

  return (
    <>
      <AdminHeader
        title="Edit Provider"
        subtitle={provider.name}
      />
      <main className="flex-1 p-8 overflow-auto">
        <EditProviderForm provider={provider} />
      </main>
    </>
  );
}
