import { AdminSidebar } from "@/components/admin/Sidebar";
import { MobileNav } from "@/components/admin/MobileNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--page-bg)" }}>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top nav — hidden on desktop */}
        <MobileNav />
        {children}
      </div>
    </div>
  );
}
