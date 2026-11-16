-- Constraints that Prisma Migrate cannot express.
-- Prisma does not introspect CHECK constraints, so review future migrations
-- to confirm these were not dropped by a table rewrite.

-- products
ALTER TABLE "products"
  ADD CONSTRAINT "products_price_non_negative" CHECK ("price" >= 0);

ALTER TABLE "products"
  ADD CONSTRAINT "products_stock_non_negative" CHECK ("stock" >= 0);

-- orders
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_total_amount_non_negative" CHECK ("total_amount" >= 0);

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_status_valid"
  CHECK ("status" IN ('PENDING', 'CONFIRMED', 'SHIPPED', 'CANCELLED'));

-- order_items
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_unit_price_non_negative" CHECK ("unit_price" >= 0);

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_subtotal_non_negative" CHECK ("subtotal" >= 0);

-- stock_movements
ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_quantity_delta_non_zero" CHECK ("quantity_delta" <> 0);

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_quantity_before_non_negative" CHECK ("quantity_before" >= 0);

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_quantity_after_non_negative" CHECK ("quantity_after" >= 0);

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_balance_consistent"
  CHECK ("quantity_after" = "quantity_before" + "quantity_delta");

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_type_sign"
  CHECK (
    ("movement_type" = 'INITIAL_STOCK' AND "quantity_delta" > 0) OR
    ("movement_type" = 'ORDER_CONFIRMED' AND "quantity_delta" < 0) OR
    ("movement_type" = 'ORDER_CANCELLED' AND "quantity_delta" > 0) OR
    ("movement_type" = 'ADJUSTMENT_IN' AND "quantity_delta" > 0) OR
    ("movement_type" = 'ADJUSTMENT_OUT' AND "quantity_delta" < 0)
  );

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_adjustment_requires_reason"
  CHECK (
    "movement_type" NOT IN ('ADJUSTMENT_IN', 'ADJUSTMENT_OUT')
    OR ("reason" IS NOT NULL AND btrim("reason") <> '')
  );
