export type ProductWithStock = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  imageUrl?: string | null;
  countryOfOrigin: string;
  originFlag: string;
  manufacturedAt: string;
  warehouses: {
    warehouseId: string;
    warehouseName: string;
    warehouseCode: string;
    country: string;
    flag: string;
    city?: string | null;
    totalUnits: number;
    reservedUnits: number;
    availableUnits: number;
  }[];
};

export type ProductsResponse = {
  products: ProductWithStock[];
};

export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "RELEASED"
  | "EXPIRED";

export type ReservationDetails = {
  id: string;
  productId: string;
  warehouseId: string;
  guestSessionId?: string | null;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  confirmedAt?: string | null;
  releasedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    category: string;
    description: string;
    countryOfOrigin: string;
    originFlag: string;
    manufacturedAt: string;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
    country: string;
    flag: string;
    city?: string | null;
  };
};

export type ReservationResponse = {
  reservation: ReservationDetails;
};