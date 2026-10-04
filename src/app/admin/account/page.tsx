"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, Save } from "lucide-react";
import { useRouter } from "next/navigation";

export default function StoreAccountPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(""); setMessage("");

    if (newPassword !== confirmPassword) {
      setError("The new password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (response.status === 401) { router.push("/admin/login"); return; }
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to change password.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setMessage("Password changed successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password.");
    } finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-[760px]">
      <section className="rounded-[28px] bg-[#111111] p-7 text-white shadow-[0_24px_65px_rgba(0,0,0,.1)] sm:p-9"><div className="flex items-center gap-3 text-[#d71920]"><LockKeyhole size={17} /><span className="text-[9px] font-black uppercase tracking-[.2em]">Account security</span></div><h1 className="mt-3 text-3xl font-black tracking-[-.04em]">Change your password.</h1><p className="mt-2 text-sm text-white/40">Store administrators can change their password at any time.</p></section>
      <form onSubmit={submit} className="mt-5 rounded-[24px] border border-black/7 bg-white p-6 shadow-[0_12px_35px_rgba(17,17,17,.05)] sm:p-8">
        {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700">{error}</div> : null}
        {message ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] text-emerald-700">{message}</div> : null}
        <Password label="Current password" value={currentPassword} onChange={setCurrentPassword} />
        <Password label="New password" value={newPassword} onChange={setNewPassword} />
        <Password label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} />
        <button type="submit" disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#d71920] px-5 py-3.5 text-[10px] font-black uppercase tracking-[.12em] text-white hover:bg-[#111111] disabled:opacity-50"><Save size={13} />{saving ? "Saving..." : "Change password"}</button>
      </form>
    </div>
  );
}

function Password({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="mt-4 block first:mt-0"><span className="text-[9px] font-black uppercase tracking-[.1em] text-black/45">{label}</span><input type="password" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-2xl border border-black/9 px-4 py-3.5 text-sm outline-none focus:border-[#d71920]/45" /></label>;
}
