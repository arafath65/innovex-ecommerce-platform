"use client";

import { FormEvent, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import { STORE_CONFIG } from "@/config/store";
import { StoreLogo } from "@/components/brand/StoreLogo";

type LoginResponse = {
  success?: boolean;
  message?: string;
  user?: {
    id: number;
    name: string;
    username: string | null;
    email: string;
    role: string;
    storeSlug: string;
  };
};

export default function AdminLoginPage() {
  const pageRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useGSAP(
    () => {
      const timeline = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      timeline
        .from(".login-glow", {
          opacity: 0,
          scale: 0.7,
          duration: 0.9,
        })
        .from(
          cardRef.current,
          {
            opacity: 0,
            y: 24,
            scale: 0.985,
            duration: 0.65,
          },
          "-=0.45",
        )
        .from(
          ".login-item",
          {
            opacity: 0,
            y: 10,
            duration: 0.35,
            stagger: 0.055,
          },
          "-=0.25",
        );
    },
    { scope: pageRef },
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const normalizedIdentifier = identifier
      .trim()
      .toLowerCase();

    if (!normalizedIdentifier || !password) {
      setError(
        "Please enter your username or email and password.",
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: normalizedIdentifier,
          storeSlug: STORE_CONFIG.slug,
          password,
        }),
      });

      const data: LoginResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Invalid username or password.",
        );
      }

      if (!data.success) {
        throw new Error(
          data.message ||
            "Unable to sign in.",
        );
      }

      gsap.to(cardRef.current, {
        opacity: 0,
        y: -10,
        scale: 0.99,
        duration: 0.28,
        ease: "power2.in",
        onComplete: () => {
          window.location.assign(
            "/admin/dashboard",
          );
        },
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to sign in.",
      );

      setSubmitting(false);

      gsap.fromTo(
        cardRef.current,
        { x: 0 },
        {
          x: 7,
          duration: 0.07,
          repeat: 5,
          yoyo: true,
          clearProps: "x",
          ease: "power1.inOut",
        },
      );
    }
  }

  return (
    <main
      ref={pageRef}
      className="relative flex min-h-screen min-h-[100svh] items-center justify-center overflow-hidden bg-[#f5f5f5] px-4 py-4 text-[#111111]"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="login-glow absolute left-1/2 top-1/2 h-[25rem] w-[25rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/7 blur-[95px]" />

        <div className="absolute left-1/2 top-1/2 h-[19rem] w-[19rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/[0.035]" />
      </div>

      <div
        ref={cardRef}
        className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-[24px] border border-black/8 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.10)]"
      >
        <div
          className="h-1.5"
          style={{
            backgroundColor:
              STORE_CONFIG.primaryColor,
          }}
        />

        <div className="p-7 sm:p-8">
          {/* LOGO */}
          <div className="login-item flex justify-center">
            <StoreLogo
              size="lg"
              showName={false}
            />
          </div>

          {/* BRAND */}
          <div className="login-item mt-3 text-center">
            <div className="text-[22px] font-extrabold uppercase tracking-[-0.035em] text-[#111111]">
              {STORE_CONFIG.name}
            </div>

            <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.19em] text-black/38">
              Store Administration
            </p>
          </div>

          <div className="login-item my-6 h-px bg-black/7" />

          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit}>
            {/* USERNAME / EMAIL */}
            <div className="login-item">
              <label
                htmlFor="identifier"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.13em] text-black/48"
              >
                Username or Email
              </label>

              <input
                id="identifier"
                name="identifier"
                type="text"
                value={identifier}
                onChange={(event) =>
                  setIdentifier(
                    event.target.value,
                  )
                }
                autoComplete="username"
                placeholder="Enter username or email"
                required
                disabled={submitting}
                className="h-12 w-full rounded-[13px] border border-black/10 bg-[#fafafa] px-4 text-sm text-[#151515] outline-none transition placeholder:text-black/25 focus:border-[#d71920]/45 focus:bg-white focus:ring-4 focus:ring-[#d71920]/8 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* PASSWORD */}
            <div className="login-item mt-4">
              <label
                htmlFor="password"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.13em] text-black/48"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  autoComplete="current-password"
                  placeholder="Enter password"
                  required
                  disabled={submitting}
                  className="h-12 w-full rounded-[13px] border border-black/10 bg-[#fafafa] px-4 pr-20 text-sm text-[#151515] outline-none transition placeholder:text-black/25 focus:border-[#d71920]/45 focus:bg-white focus:ring-4 focus:ring-[#d71920]/8 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value,
                    )
                  }
                  disabled={submitting}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[9px] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/40 transition hover:bg-black/5 hover:text-black disabled:opacity-40"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>
            </div>

            {/* ERROR */}
            {error ? (
              <div
                role="alert"
                className="login-item mt-4 rounded-[12px] border border-red-900/10 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-800"
              >
                {error}
              </div>
            ) : null}

            {/* SUBMIT */}
            <div className="login-item mt-5">
              <button
                type="submit"
                disabled={submitting}
                className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-[13px] text-sm font-semibold text-white shadow-[0_12px_24px_rgba(215,25,32,0.18)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(215,25,32,0.24)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65"
                style={{
                  backgroundColor:
                    STORE_CONFIG.primaryColor,
                }}
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition duration-700 group-hover:translate-x-full" />

                <span className="relative">
                  {submitting
                    ? "Signing in..."
                    : "Sign in"}
                </span>

                <span className="relative ml-2 text-base transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </button>
            </div>
          </form>

          {/* FOOTER */}
          <div className="login-item mt-5 border-t border-black/7 pt-4 text-center">
            <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-black/28">
              Authorized store administrators
              only
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}