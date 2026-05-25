import { z } from "zod";

export const createReservationSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  quantity: z
    .number({
      error: "Quantity is required",
    })
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than 0")
    .max(100, "Quantity is too large"),
  guestSessionId: z.string().optional(),
});

export type CreateReservationInput = z.infer<
  typeof createReservationSchema
>;