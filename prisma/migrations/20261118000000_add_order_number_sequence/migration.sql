-- Global sequence for order numbers. Values are intentionally not transactional and may contain gaps.
CREATE SEQUENCE "order_number_sequence" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
