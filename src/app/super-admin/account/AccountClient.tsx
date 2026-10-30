
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  KeyRound,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";

type AccountForm = {
  name: string;
  username: string;
  email: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function AccountClient() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<AccountForm>({
    name: "",
    username: "",
    email: "",
  });

  const [passwords, setPasswords] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const response = await fetch(
          "/api/super-admin/account",
          {
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          router.push("/super-admin/login");
          return;
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Failed to load account.",
          );
        }

        if (cancelled) {
          return;
        }

        setForm({
          name: data.account?.name ?? "",
          username: data.account?.username ?? "",
          email: data.account?.email ?? "",
        });
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load account.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function saveProfile(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/super-admin/account",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      if (response.status === 401) {
        router.push("/super-admin/login");
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to save account.",
        );
      }

      setForm({
        name: data.account?.name ?? "",
        username: data.account?.username ?? "",
        email: data.account?.email ?? "",
      });

      setSuccess(
        "Account profile updated successfully.",
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save account.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (changingPassword) {
      return;
    }

    setError("");
    setSuccess("");

    if (
      !passwords.currentPassword ||
      !passwords.newPassword ||
      !passwords.confirmPassword
    ) {
      setError(
        "Please complete all password fields.",
      );
      return;
    }

    if (passwords.newPassword.length < 8) {
      setError(
        "New password must be at least 8 characters.",
      );
      return;
    }

    if (
      passwords.newPassword !==
      passwords.confirmPassword
    ) {
      setError(
        "New password and confirmation do not match.",
      );
      return;
    }

    if (
      passwords.currentPassword ===
      passwords.newPassword
    ) {
      setError(
        "New password must be different from the current password.",
      );
      return;
    }

    setChangingPassword(true);

    try {
      const response = await fetch(
        "/api/super-admin/account/password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(passwords),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to change password.",
        );
      }

      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setSuccess(
        "Password changed successfully. Redirecting to login...",
      );

      window.setTimeout(() => {
        router.push("/super-admin/login");
        router.refresh();
      }, 800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to change password.",
      );
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-[70vh] place-items-center">
        <RefreshCw
          className="animate-spin text-[#d71920]"
          size={22}
        />
      </main>
    );
  }

  return (
    <main>
      <div className="mx-auto max-w-[1000px] px-5 py-8 sm:px-8 lg:px-10">
        <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#d71920]">
          Platform security
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">
          My Account
        </h1>

        <p className="mt-2 text-sm text-black/45">
          Manage your Super Admin identity and password.
        </p>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] font-medium text-emerald-700">
            <Check size={14} />
            {success}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={saveProfile}
            className="rounded-[24px] border border-black/7 bg-white p-6"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[#111111] text-white">
                <ShieldCheck size={16} />
              </div>

              <div>
                <h2 className="text-base font-black">
                  Profile
                </h2>

                <p className="text-[10px] text-black/35">
                  Your platform administrator identity
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <Field
                label="Name"
                value={form.name}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    name: value,
                  }))
                }
              />

              <Field
                label="Username"
                value={form.username}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    username:
                      value
                        .toLowerCase()
                        .replace(/\s+/g, ""),
                  }))
                }
              />

              <Field
                label="Email"
                type="email"
                value={form.email}
                required={false}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    email: value,
                  }))
                }
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#111111] px-4 py-3 text-[9px] font-black uppercase tracking-[.1em] text-white transition hover:bg-[#d71920] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={14} />

              {saving
                ? "Saving..."
                : "Save changes"}
            </button>
          </form>

          <form
            onSubmit={changePassword}
            className="rounded-[24px] border border-black/7 bg-white p-6"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[#d71920] text-white">
                <KeyRound size={16} />
              </div>

              <div>
                <h2 className="text-base font-black">
                  Change password
                </h2>

                <p className="text-[10px] text-black/35">
                  Passwords are stored as secure bcrypt
                  hashes.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <Field
                label="Current password"
                type="password"
                value={
                  passwords.currentPassword
                }
                onChange={(value) =>
                  setPasswords((current) => ({
                    ...current,
                    currentPassword: value,
                  }))
                }
              />

              <Field
                label="New password"
                type="password"
                value={passwords.newPassword}
                onChange={(value) =>
                  setPasswords((current) => ({
                    ...current,
                    newPassword: value,
                  }))
                }
              />

              <Field
                label="Confirm new password"
                type="password"
                value={
                  passwords.confirmPassword
                }
                onChange={(value) =>
                  setPasswords((current) => ({
                    ...current,
                    confirmPassword: value,
                  }))
                }
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#d71920] px-4 py-3 text-[9px] font-black uppercase tracking-[.1em] text-white transition hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <KeyRound size={14} />

              {changingPassword
                ? "Changing..."
                : "Change password"}
            </button>

            <p className="mt-4 text-[9px] leading-4 text-black/30">
              Changing the password signs out all existing
              Super Admin sessions and requires a fresh login.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[9px] font-black uppercase tracking-[.1em] text-black/45">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        required={required}
        className="mt-1.5 w-full rounded-xl border border-black/9 bg-[#faf9f6] px-3.5 py-3 text-xs outline-none transition focus:border-[#d71920]/45 focus:ring-2 focus:ring-[#d71920]/10"
      />
    </label>
  );
}