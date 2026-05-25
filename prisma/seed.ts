import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  const warehouses = await Promise.all([
    prisma.warehouse.create({
      data: {
        name: "Odessa Forward Depot",
        code: "ODS-FWD",
        country: "Ukraine",
        flag: "🇺🇦",
        city: "Odessa",
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "Sofia Surplus Yard",
        code: "SOF-SUR",
        country: "Bulgaria",
        flag: "🇧🇬",
        city: "Sofia",
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "Freetown Holding Facility",
        code: "FRE-HLD",
        country: "Sierra Leone",
        flag: "🇸🇱",
        city: "Freetown",
      },
    }),
  ]);

  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: ".357 Magnum - A used gun",
        slug: "ak-pattern-rifle-crate",
        category: "Small Arms",
        description:
          "Used once by charismatic african leader, it will never jam!",
        countryOfOrigin: "United States",
        originFlag: "🇺🇸",
        manufacturedAt: new Date("1992-05-25"),
      },
    }),
    prisma.product.create({
      data: {
        name: "Non-Standard AK ammo - 7.62mm",
        slug: "762mm-ammunition-pallet",
        category: "Ammunition",
        description:
          "Bulk-packaged ammunition pallets, intriguing country of origin. Provided by AEY inc. Possibly Chinese.",
        countryOfOrigin: "Albania",
        originFlag: "🇦🇱",
        manufacturedAt: new Date("1972-09-23"),
      },
    }),
    prisma.product.create({
      data: {
        name: "Soviet made AK-47s",
        slug: "ak-pattern-rifle-crate",
        category: "Small Arms",
        description:
          "[HEAVY ON DEMAND] A sealed procurement lot of rugged field rifles, never fails!",
        countryOfOrigin: "Russia",
        originFlag: "🇷🇺",
        manufacturedAt: new Date("1989-05-07"),
      },
    }),
    prisma.product.create({
      data: {
        name: "T-72 Armored Unit",
        slug: "t72-armored-unit",
        category: "Armor",
        description:
          "Heavy tracked armored vehicle straight out from the vast steppe.",
        countryOfOrigin: "Soviet Union",
        originFlag: "🇷🇺",
        manufacturedAt: new Date("1983-11-03"),
      },
    }),
    prisma.product.create({
      data: {
        name: "MiG-21",
        slug: "mig-airframe-package",
        category: "Aircraft",
        description:
          "Supersonic flying coffins, preferred fighter plane of choice for when corruption and bureacracy colludes.",
        countryOfOrigin: "Soviet Union",
        originFlag: "🇷🇺",
        manufacturedAt: new Date("1979-09-17"),
      },
    }),
  ]);

  const inventoryData = [
    { product: products[0], warehouse: warehouses[2], totalUnits: 1 },
    { product: products[1], warehouse: warehouses[1], totalUnits: 200 },
    { product: products[1], warehouse: warehouses[2], totalUnits: 150 },
    { product: products[2], warehouse: warehouses[0], totalUnits: 500 },
    { product: products[2], warehouse: warehouses[2], totalUnits: 100 },
    { product: products[3], warehouse: warehouses[1], totalUnits: 300 },
    { product: products[4], warehouse: warehouses[0], totalUnits: 20 }
  ];

  for (const item of inventoryData) {
    await prisma.inventory.create({
      data: {
        productId: item.product.id,
        warehouseId: item.warehouse.id,
        totalUnits: item.totalUnits,
        reservedUnits: 0,
      },
    });
  }

  console.log("Database seeded successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });