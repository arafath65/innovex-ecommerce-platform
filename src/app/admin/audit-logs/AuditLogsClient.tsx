"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

type Log = {
  id: number;
  actorType: "STORE_USER" | "SUPER_ADMIN" | "SYSTEM";
  module: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  description: string;
  createdAt: string;
  storeUser?: { name: string; username: string; role: string } | null;
  superAdmin?: { name: string; username: string } | null;
};

export default function AuditLogsClient() {
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "50" });
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, { cache: "no-store" });
      if (response.status === 401) { router.push("/admin/login"); return; }
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to load audit logs.");
      setLogs(data.logs ?? []);
      setTotal(Number(data.pagination?.total ?? 0));
      setTotalPages(Number(data.pagination?.totalPages ?? 1));
      if (Number(data.pagination?.page) && Number(data.pagination.page) !== page) setPage(Number(data.pagination.page));
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, router, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="admin-page mx-auto max-w-[1200px]">
      <section className="rounded-[28px] bg-[#111111] p-6 text-white shadow-[0_28px_70px_rgba(0,0,0,.1)] sm:p-8">
        <div className="flex items-center gap-3 text-[#d71920]"><ShieldCheck size={17} /><span className="text-[9px] font-black uppercase tracking-[.2em]">Store audit trail</span></div>
        <h1 className="mt-3 text-3xl font-black tracking-[-.04em]">Who changed what.</h1>
        <p className="mt-2 text-sm text-white/40">Every tracked store action is shown here with its actor and timestamp.</p>
      </section>

      <div className="mt-5 flex gap-3 rounded-[22px] border border-black/7 bg-white p-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-black/8 bg-[#faf9f6] px-3.5"><Search size={15} className="text-black/30" /><input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Search module, action, entity or description..." className="min-w-0 flex-1 bg-transparent py-3 text-xs outline-none" /></div>
        <button type="button" onClick={() => void load()} className="grid size-11 shrink-0 place-items-center rounded-2xl border border-black/8 bg-[#faf9f6] text-black/50 hover:text-black"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button>
      </div>

      <div className="mt-5 overflow-hidden rounded-[22px] border border-black/7 bg-white">
        <div className="grid grid-cols-[145px_130px_150px_1fr_160px] gap-4 border-b border-black/7 bg-[#faf9f6] px-4 py-3 text-[8px] font-black uppercase tracking-[.12em] text-black/35 sm:px-5"><span>Time</span><span>Actor</span><span>Module</span><span>Action / Description</span><span>Entity</span></div>
        {loading ? <div className="grid min-h-[240px] place-items-center"><RefreshCw className="animate-spin text-[#d71920]" /></div> : logs.length === 0 ? <div className="grid min-h-[240px] place-items-center text-sm text-black/30">No audit entries yet.</div> : logs.map((log) => <div key={log.id} className="grid grid-cols-[145px_130px_150px_1fr_160px] gap-4 border-b border-black/6 px-4 py-4 text-[10px] last:border-0 sm:px-5"><span className="text-black/40">{new Date(log.createdAt).toLocaleString()}</span><span><strong className="block text-black/70">{log.storeUser?.name ?? log.superAdmin?.name ?? "System"}</strong><span className="text-[8px] uppercase text-black/30">{log.actorType.replace("_", " ")}</span></span><span><strong className="block text-[#d71920]">{log.module}</strong><span className="text-[8px] text-black/35">{log.action}</span></span><span className="leading-5 text-black/60">{log.description}</span><span className="text-black/40">{log.entity ?? "—"}{log.entityId ? ` #${log.entityId}` : ""}</span></div>)}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-black/7 bg-white px-4 py-3"><span className="text-[10px] text-black/35">{total.toLocaleString()} entries</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="grid size-9 place-items-center rounded-xl border border-black/8 disabled:opacity-30"><ChevronLeft size={14} /></button><span className="min-w-16 text-center text-[10px] font-bold text-black/55">{page} / {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="grid size-9 place-items-center rounded-xl border border-black/8 disabled:opacity-30"><ChevronRight size={14} /></button></div></div>
    </div>
  );
}
