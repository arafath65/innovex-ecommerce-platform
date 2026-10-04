"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/super-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Invalid credentials.");

      router.push("/super-admin/stores");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0d0d0d] px-5 py-10 text-white">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#d71920] shadow-[0_18px_45px_rgba(215,25,32,.25)]">
            <ShieldCheck size={25} />
          </div>
          <p className="mt-5 text-[9px] font-black uppercase tracking-[.2em] text-white/35">Innovex Platform</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Super Admin</h1>
          <p className="mt-2 text-sm text-white/40">Manage every store from one secure control plane.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[28px] border border-white/10 bg-white/[.045] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {error ? <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-[11px] text-red-200">{error}</div> : null}

          <label className="block">
            <span className="text-[9px] font-black uppercase tracking-[.1em] text-white/40">Username</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none focus:border-[#d71920]/60" />
          </label>

          <label className="mt-4 block">
            <span className="text-[9px] font-black uppercase tracking-[.1em] text-white/40">Password</span>
            <div className="mt-2 flex overflow-hidden rounded-2xl border border-white/10 bg-black/20 focus-within:border-[#d71920]/60">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm outline-none" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="grid w-12 place-items-center text-white/35 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          <button type="submit" disabled={submitting} className="mt-6 w-full rounded-2xl bg-[#d71920] px-4 py-3.5 text-[10px] font-black uppercase tracking-[.14em] text-white transition hover:bg-white hover:text-black disabled:opacity-50">
            {submitting ? "Signing in..." : "Enter control panel"}
          </button>
        </form>
      </div>
    </main>
  );
}
