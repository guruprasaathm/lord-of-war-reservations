type ProductsResponse = {
  products: Array<{
    id: string;
    name: string;
    warehouses: Array<{
      warehouseId: string;
      warehouseName: string;
      availableUnits: number;
    }>;
  }>;
};

type TestResult = {
  index: number;
  status: number;
  body: unknown;
};

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

async function main() {
  console.log("Fetching products...");

  const productsResponse = await fetch(`${BASE_URL}/api/products`);

  if (!productsResponse.ok) {
    throw new Error(`Failed to fetch products: ${productsResponse.status}`);
  }

  const data = (await productsResponse.json()) as ProductsResponse;

  const target = data.products
    .flatMap((product) =>
      product.warehouses.map((warehouse) => ({
        product,
        warehouse,
      }))
    )
    .find((item) => item.warehouse.availableUnits === 1);

  if (!target) {
    throw new Error(
      "No product/warehouse pair with exactly 1 available unit found. Run npm run db:seed first."
    );
  }

  console.log("Target selected:");
  console.log(`Product: ${target.product.name}`);
  console.log(`Warehouse: ${target.warehouse.warehouseName}`);
  console.log(`Available units before test: ${target.warehouse.availableUnits}`);
  console.log("");

  const requestCount = 20;

  const body = {
    productId: target.product.id,
    warehouseId: target.warehouse.warehouseId,
    quantity: 1,
    guestSessionId: "concurrency-test",
  };

  console.log(`Firing ${requestCount} simultaneous reservation requests...`);

  const results: TestResult[] = await Promise.all(
    Array.from({ length: requestCount }, async (_, index) => {
      const response = await fetch(`${BASE_URL}/api/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      let responseBody: unknown;

      try {
        responseBody = await response.json();
      } catch {
        responseBody = null;
      }

      return {
        index,
        status: response.status,
        body: responseBody,
      };
    })
  );

  const successCount = results.filter((result) => result.status === 201).length;
  const conflictCount = results.filter((result) => result.status === 409).length;
  const otherCount = results.length - successCount - conflictCount;

  console.log("");
  console.log("Concurrency test result:");
  console.log(`Successful reservations: ${successCount}`);
  console.log(`409 conflicts: ${conflictCount}`);
  console.log(`Other responses: ${otherCount}`);
  console.log("");

  for (const result of results) {
    console.log(`#${result.index + 1}: HTTP ${result.status}`);
  }

  console.log("");

  if (successCount === 1 && conflictCount === requestCount - 1) {
    console.log("PASS: only one request reserved the final available unit.");
    return;
  }

  console.error("FAIL: concurrency guarantee did not behave as expected.");
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 