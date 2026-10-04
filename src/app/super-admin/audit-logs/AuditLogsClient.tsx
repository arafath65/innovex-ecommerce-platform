
"use client";

import { useCallback, useEffect, useState } from "react";
import { FileClock, RefreshCw, Search } from "lucide-react";

type AuditLog = {
  id: number;
  module: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  description: string;
  createdAt: string;
  store: {
    id: number;
    name: string;
    slug: string;
  } | null;
  superAdmin: {
    id: number;
    name: string;
    username: string;
  } | null;
};

type StoreOption = {
  id: number;
  name: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export default function AuditLogsClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [storeId, setStoreId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "25",
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (module) {
        params.set("module", module);
      }

      if (action) {
        params.set("action", action);
      }

      if (storeId) {
        params.set("storeId", storeId);
      }

      const response = await fetch(
        `/api/super-admin/audit-logs?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load audit logs.");
      }

      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setStores(Array.isArray(data.stores) ? data.stores : []);
      setPagination(data.pagination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load audit logs.",
      );
    } finally {
      setLoading(false);
    }
  }, [action, module, page, search, storeId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLogs();
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadLogs]);

  function handleSearchChange(value: string) {
    setPage(1);
    setSearch(value);
  }

  function handleModuleChange(value: string) {
    setPage(1);
    setModule(value);
  }

  function handleActionChange(value: string) {
    setPage(1);
    setAction(value);
  }

  function handleStoreChange(value: string) {
    setPage(1);
    setStoreId(value);
  }

  const hasPrevious = page > 1;

  const hasNext =
    pagination.totalPages > 0 &&
    page < pagination.totalPages;

  return (
    <main>
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#d71920]">
              Platform activity
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">
              Super Admin Audit Logs
            </h1>

            <p className="mt-2 text-sm text-black/45">
              Every Super Admin action recorded across the platform.
            </p>
          </div>

          <div className="rounded-2xl border border-black/7 bg-white px-4 py-3 text-right">
            <p className="text-[8px] font-black uppercase tracking-[.12em] text-black/30">
              Total entries
            </p>

            <p className="mt-1 text-lg font-black">
              {pagination.total}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 rounded-[24px] border border-black/7 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
            <div className="flex items-center gap-2 rounded-xl border border-black/8 bg-[#faf9f6] px-3">
              <Search
                size={14}
                className="text-black/30"
              />

              <input
                value={search}
                onChange={(event) =>
                  handleSearchChange(event.target.value)
                }
                placeholder="Search activity..."
                className="min-w-0 flex-1 bg-transparent py-3 text-xs outline-none"
              />
            </div>

            <select
              value={storeId}
              onChange={(event) =>
                handleStoreChange(event.target.value)
              }
              className="rounded-xl border border-black/8 bg-[#faf9f6] px-3 py-3 text-xs outline-none"
            >
              <option value="">All stores</option>

              {stores.map((store) => (
                <option
                  key={store.id}
                  value={store.id}
                >
                  {store.name}
                </option>
              ))}
            </select>

            <select
              value={module}
              onChange={(event) =>
                handleModuleChange(event.target.value)
              }
              className="rounded-xl border border-black/8 bg-[#faf9f6] px-3 py-3 text-xs outline-none"
            >
              <option value="">All modules</option>
              <option value="AUTH">AUTH</option>
              <option value="ACCOUNT">ACCOUNT</option>
              <option value="STORES">STORES</option>
            </select>

            <input
              value={action}
              onChange={(event) =>
                handleActionChange(
                  event.target.value.toUpperCase(),
                )
              }
              placeholder="Action"
              className="rounded-xl border border-black/8 bg-[#faf9f6] px-3 py-3 text-xs outline-none"
            />

            <button
              type="button"
              onClick={() => void loadLogs()}
              className="grid size-11 place-items-center rounded-xl border border-black/8 bg-[#faf9f6] text-black/50 hover:text-black"
              title="Refresh"
              aria-label="Refresh audit logs"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-black/7 bg-white">
          {loading ? (
            <div className="grid min-h-[260px] place-items-center">
              <RefreshCw
                className="animate-spin text-[#d71920]"
                size={22}
              />
            </div>
          ) : logs.length === 0 ? (
            <div className="grid min-h-[260px] place-items-center p-8 text-center">
              <div>
                <FileClock className="mx-auto text-black/20" />

                <p className="mt-3 text-sm font-black">
                  No Super Admin activity found
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[140px_150px_1fr_170px_160px] gap-4 border-b border-black/7 bg-[#faf9f6] px-5 py-3 text-[8px] font-black uppercase tracking-[.1em] text-black/30 md:grid">
                <span>When</span>
                <span>Module / action</span>
                <span>Description</span>
                <span>Store</span>
                <span>Actor</span>
              </div>

              {logs.map((log) => (
                <div
                  key={log.id}
                  className="grid gap-3 border-b border-black/6 px-5 py-4 last:border-0 md:grid-cols-[140px_150px_1fr_170px_160px] md:items-start md:gap-4"
                >
                  <div className="text-[10px] text-black/40">
                    {formatDate(log.createdAt)}
                  </div>

                  <div>
                    <span className="rounded-md bg-[#111111] px-2 py-1 text-[8px] font-black text-white">
                      {log.module}
                    </span>

                    <p className="mt-2 text-[10px] font-bold text-[#d71920]">
                      {log.action}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium leading-5 text-black/70">
                      {log.description}
                    </p>

                    {log.entity ? (
                      <p className="mt-1 text-[9px] text-black/30">
                        {log.entity}
                        {log.entityId
                          ? ` #${log.entityId}`
                          : ""}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-xs font-semibold text-black/55">
                    {log.store?.name ?? "Platform"}
                  </div>

                  <div className="text-xs font-semibold text-black/55">
                    {log.superAdmin
                      ? `${log.superAdmin.name} (@${log.superAdmin.username})`
                      : "Super Admin"}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-black/7 bg-white px-4 py-3">
          <p className="text-[10px] text-black/40">
            Page{" "}
            {pagination.totalPages === 0
              ? 1
              : pagination.page}{" "}
            of {pagination.totalPages || 1}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!hasPrevious || loading}
              onClick={() =>
                setPage((current) => current - 1)
              }
              className="rounded-xl border border-black/8 px-3 py-2 text-[9px] font-black uppercase tracking-[.08em] disabled:opacity-30"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={!hasNext || loading}
              onClick={() =>
                setPage((current) => current + 1)
              }
              className="rounded-xl bg-[#111111] px-3 py-2 text-[9px] font-black uppercase tracking-[.08em] text-white disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}