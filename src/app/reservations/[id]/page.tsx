"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReservationDetails, ReservationResponse } from "@/lib/types";

function formatTimeLeft(ms: number) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

export default function ReservationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [now, setNow] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadReservation() {
    setError(null);

    try {
      const response = await fetch(`/api/reservations/${params.id}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as ReservationResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load reservation.");
      }

      setReservation(data.reservation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadReservation();
  }, [params.id]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 500);

    return () => window.clearInterval(interval);
  }, []);

  const timeLeftMs = useMemo(() => {
    if (!reservation) return 0;
    return new Date(reservation.expiresAt).getTime() - now;
  }, [reservation, now]);

  const isExpiredByClock = timeLeftMs <= 0;
  const canAct = reservation?.status === "PENDING" && !isExpiredByClock;

  async function confirmOrder() {
    setIsActing(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/reservations/${params.id}/confirm`, {
        method: "POST",
        headers: {
          "Idempotency-Key": crypto.randomUUID(),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 410) {
          throw new Error("Reservation has expired. The cargo was released.");
        }

        throw new Error(data.error ?? "Unable to confirm reservation.");
      }

      setReservation(data.reservation);
      setMessage("Order confirmed. Inventory has been permanently decremented.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed.");
      await loadReservation();
    } finally {
      setIsActing(false);
    }
  }

  async function cancelReservation() {
    setIsActing(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/reservations/${params.id}/release`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to cancel reservation.");
      }

      setReservation(data.reservation);
      setMessage("Negotiation aborted. Reserved stock has been released.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancellation failed.");
    } finally {
      setIsActing(false);
    }
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0b0d0a] text-stone-100">
        <p className="text-stone-400">Loading reservation dossier...</p>
      </main>
    );
  }

  if (!reservation) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0b0d0a] px-6 text-stone-100">
        <div className="max-w-md rounded border border-red-500/40 bg-red-950/30 p-6">
          <h1 className="text-xl font-bold">Reservation unavailable</h1>
          <p className="mt-2 text-sm text-red-100">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded bg-amber-300 px-4 py-2 text-sm font-bold text-black"
          >
            Return to catalog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0d0a] px-6 py-8 text-stone-100 md:px-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm text-amber-200 hover:text-amber-100">
          ← Back to catalog
        </Link>

        <section className="mt-6 overflow-hidden rounded-xl border border-stone-800 bg-[#11140f] shadow-2xl shadow-black/30">
          <div className="border-b border-stone-800 bg-[linear-gradient(135deg,_#2b2e22,_#080907)] p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-200">
              Reservation Dossier
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase md:text-5xl">
              {reservation.product.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">
              {reservation.product.description}
            </p>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Status" value={reservation.status} />
                <Info label="Quantity" value={String(reservation.quantity)} />
                <Info
                  label="Depot"
                  value={`${reservation.warehouse.flag} ${reservation.warehouse.name}`}
                />
                <Info
                  label="Origin"
                  value={`${reservation.product.originFlag} ${reservation.product.countryOfOrigin}`}
                />
              </div>

              {message && (
                <div className="rounded border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
                  {message}
                </div>
              )}

              {error && (
                <div className="rounded border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}
            </div>

            <aside className="rounded-lg border border-stone-800 bg-black/30 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
                Window closes in
              </p>

              <p
                className={`mt-3 font-mono text-5xl font-black ${
                  canAct ? "text-amber-200" : "text-stone-500"
                }`}
              >
                {formatTimeLeft(timeLeftMs)}
              </p>

              <p className="mt-3 text-sm text-stone-400">
                Reserved merchandise returns to available inventory if not
                confirmed before expiry.
              </p>

              <div className="mt-6 space-y-3">
                <button
                  disabled={!canAct || isActing}
                  onClick={confirmOrder}
                  className="w-full rounded bg-emerald-400 px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
                >
                  {isActing ? "Processing..." : "Confirm Order and Pay"}
                </button>

                <button
                  disabled={reservation.status !== "PENDING" || isActing}
                  onClick={cancelReservation}
                  className="w-full rounded border border-stone-600 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-stone-200 transition hover:bg-stone-900 disabled:cursor-not-allowed disabled:border-stone-800 disabled:text-stone-600"
                >
                  Cancel
                </button>
              </div>

              {isExpiredByClock && reservation.status === "PENDING" && (
                <p className="mt-4 rounded border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs text-red-100">
                  This reservation appears expired. Confirming will return a
                  410 response from the server.
                </p>
              )}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-stone-800 bg-black/30 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}