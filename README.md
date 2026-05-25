# Lord of War — Inventory Reservation System

<p align="center">
  <strong>A concurrency-safe inventory reservation demo built with Next.js, Prisma, and Postgres.</strong>
</p>

<p align="center">
  <em>Conflict-free deliveries for conflict likely situations.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-App%20Router-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Postgres-Neon-00E599?style=for-the-badge&logo=postgresql" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma" />
  <img src="https://img.shields.io/badge/Hosted-VPS-green?style=for-the-badge" />
</p>

---

## Live Demo

**Live URL:** [https://lordofwar.guruprasaathm.com](https://lordofwar.guruprasaathm.com)

**Repository:** `https://github.com/YOUR_USERNAME/lord-of-war-reservations`

---

## Overview

This project is my implementation of an end-to-end inventory reservation system for a multi-warehouse retail scenario.

The core problem is a common checkout race condition:

> Multiple customers may try to reserve or purchase the same final unit of stock at nearly the same time.

To solve this, I built a reservation flow where stock is temporarily held during checkout. If the user confirms within the reservation window, the stock is permanently decremented. If the user cancels or the timer expires, the reserved units are released back into the available inventory pool.

The frontend uses a fictional cinematic procurement-catalog theme inspired by *Lord of War*. The theme is purely fictional and used as a creative presentation layer; the engineering focus is on correctness, concurrency, idempotency, and inventory state transitions.

---

## Features Implemented

### Core Features

- Product catalog with warehouse-level stock visibility
- Multiple warehouses / depots per product
- Available stock and reserved stock shown separately
- Reservation creation with a 60-second expiry window
- Checkout/reservation page with live countdown timer
- Confirm purchase flow
- Cancel reservation flow
- Automatic release of expired reservations
- Visible error states for:
  - `409 Conflict` when stock is unavailable
  - `410 Gone` when a reservation has expired
- Hosted live deployment on VPS
- Seeded database for immediate demo usage

### Backend Features

- Next.js App Router API routes
- Prisma ORM with hosted Postgres
- Transaction-safe reservation logic
- Atomic stock update to prevent overselling
- Reservation state machine:
  - `PENDING`
  - `CONFIRMED`
  - `RELEASED`
  - `EXPIRED`
- Idempotency support for reservation and confirmation flows
- Guest-session based reservation tracking
- Concurrency stress test script

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Hosted Postgres using Neon |
| ORM | Prisma |
| Validation | Zod |
| Hosting | VPS |
| Reverse Proxy | Nginx |
| Process Manager | PM2 |
| Deployment URL | `lordofwar.guruprasaathm.com` |

---

## Data Model

The application uses the following main entities:

### Product

Represents a catalog item.

Fields include:

- name
- slug
- category
- description
- image URL
- country of origin
- manufacturing date

### Warehouse

Represents a physical stock location.

Fields include:

- name
- code
- country
- city
- flag

### Inventory

Represents stock for a product at a specific warehouse.

Important fields:

- `totalUnits`
- `reservedUnits`

Available stock is derived as:

```txt
availableUnits = totalUnits - reservedUnits
