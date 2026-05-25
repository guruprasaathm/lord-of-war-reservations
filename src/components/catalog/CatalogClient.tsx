"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getGuestSessionId } from "@/lib/guest-session";
import type { ProductWithStock, ProductsResponse } from "@/lib/types";

export function CatalogClient() {
  const router = useRouter();

  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReservationKey, setActiveReservationKey] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  async function loadProducts() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/products", {
        cache: "no-store",
      });

      const data = (await response.json()) as ProductsResponse;

      if (!response.ok) {
        throw new Error("Unable to load catalog inventory.");
      }

      setProducts(data.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const totalAvailable = useMemo(() => {
    return products.reduce(
      (sum, product) =>
        sum +
        product.warehouses.reduce(
          (warehouseSum, warehouse) => warehouseSum + warehouse.availableUnits,
          0
        ),
      0
    );
  }, [products]);

  async function reserveCargo(productId: string, warehouseId: string) {
    const reservationKey = `${productId}:${warehouseId}`;
    setActiveReservationKey(reservationKey);
    setError(null);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          productId,
          warehouseId,
          quantity: 1,
          guestSessionId: getGuestSessionId(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("Not enough stock available. Another buyer got there first.");
        }

        throw new Error(data.error ?? "Reservation failed.");
      }

      router.push(`/reservations/${data.reservation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reservation failed.");
      await loadProducts();
    } finally {
      setActiveReservationKey(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0d0a] text-stone-100">
      <section className="relative min-h-[30vh] overflow-hidden border-b border-stone-700/60 bg-[radial-gradient(circle_at_top_left,_#3b341f,_#0b0d0a_45%)]">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(0,0,0,0.65),_rgba(0,0,0,0.2)),url('/hero/hero.jpg')] bg-cover bg-center opacity-80" />

        <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded border border-stone-500 bg-black/60 text-xs font-bold tracking-widest text-amber-200">
              LOW
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-amber-200/80">
                Global Depot Network
              </p>
              <h1 className="text-2xl font-black uppercase tracking-wider md:text-4xl">
                Lord of War
              </h1>
            </div>
          </div>

          <div className="hidden rounded-full border border-emerald-500/40 bg-emerald-950/50 px-4 py-2 text-xs uppercase tracking-[0.25em] text-emerald-200 md:block">
            Live Reservation Engine
          </div>
        </nav>

        <div className="relative z-10 max-w-5xl px-6 pb-10 pt-8 md:px-10">
          <p className="mb-4 inline-flex rounded-full border border-amber-300/30 bg-amber-950/30 px-3 py-1 text-xs uppercase tracking-[0.25em] text-amber-100">
            Fictional procurement catalog
          </p>
          <h2 className="max-w-3xl text-3xl font-black uppercase leading-tight tracking-tight md:text-6xl">
            Conflict-free deliveries for conflict likely situations.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-300 md:text-base">
            Browse warehouse-level inventory, place a short negotiation hold,
            and confirm before the reservation window closes.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 md:px-10">
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-stone-800 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-stone-500">
              Available Inventory
            </p>
            <h3 className="mt-2 text-2xl font-bold">Catalog Manifest</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm md:flex">
            <div className="rounded border border-stone-700 bg-stone-950 px-4 py-3">
              <p className="text-stone-500">Catalog items</p>
              <p className="text-xl font-bold">{products.length}</p>
            </div>
            <div className="rounded border border-stone-700 bg-stone-950 px-4 py-3">
              <p className="text-stone-500">Available units</p>
              <p className="text-xl font-bold text-emerald-300">{totalAvailable}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="rounded border border-stone-800 bg-stone-950 p-8 text-stone-400">
            Loading inventory manifest...
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-lg border border-stone-800 bg-[#11140f] shadow-2xl shadow-black/30"
              >
                <div className="flex h-40 items-end bg-[linear-gradient(135deg,_#2b2e22,_#080907)] p-4">
                  <div>
                    <p className="mb-2 inline-flex rounded bg-black/40 px-2 py-1 text-xs uppercase tracking-[0.25em] text-amber-200">
                      {product.category}
                    </p>
                    <h4 className="text-2xl font-black uppercase leading-7">
                      {product.name}
                    </h4>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <p className="line-clamp-3 text-sm leading-6 text-stone-300">
                    {product.description}
                  </p>

                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between border-b border-stone-800 pb-2">
                      <span className="text-stone-500">Origin</span>
                      <span>
                        {product.originFlag} {product.countryOfOrigin}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-stone-800 pb-2">
                      <span className="text-stone-500">Manufactured</span>
                      <span>
                        {new Date(product.manufacturedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {product.warehouses.map((warehouse) => {
                      const key = `${product.id}:${warehouse.warehouseId}`;
                      const isReserving = activeReservationKey === key;
                      const isOut = warehouse.availableUnits <= 0;

                      return (
                        <div
                          key={warehouse.warehouseId}
                          className="rounded border border-stone-800 bg-black/30 p-3"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">
                                {warehouse.flag} {warehouse.warehouseName}
                              </p>
                              <p className="text-xs text-stone-500">
                                {warehouse.city}, {warehouse.country}
                              </p>
                            </div>
                            <span className="rounded bg-stone-800 px-2 py-1 text-xs text-stone-300">
                              {warehouse.warehouseCode}
                            </span>
                          </div>

                          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded bg-stone-900 p-2">
                              <p className="text-stone-500">Total</p>
                              <p className="text-lg font-bold">
                                {warehouse.totalUnits}
                              </p>
                            </div>
                            <div className="rounded bg-amber-950/40 p-2">
                              <p className="text-stone-500">Negotiating</p>
                              <p className="text-lg font-bold text-amber-200">
                                {warehouse.reservedUnits}
                              </p>
                            </div>
                            <div className="rounded bg-emerald-950/40 p-2">
                              <p className="text-stone-500">Available</p>
                              <p className="text-lg font-bold text-emerald-300">
                                {warehouse.availableUnits}
                              </p>
                            </div>
                          </div>

                          <button
                            disabled={isOut || isReserving}
                            onClick={() =>
                              reserveCargo(product.id, warehouse.warehouseId)
                            }
                            className="w-full rounded bg-amber-300 px-4 py-2 text-sm font-bold uppercase tracking-[0.2em] text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
                          >
                            {isOut
                              ? "Unavailable"
                              : isReserving
                                ? "Reserving..."
                                : "Reserve Cargo"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}