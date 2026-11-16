# StockFlow — Software Requirements Specification (SRS)

**Document Version:** 1.0
**Status:** Approved
**Project:** StockFlow
**Document Type:** Software Requirements Specification

## 1. Introduction

### 1.1 Purpose

This document defines the functional requirements, non-functional requirements, business rules, and acceptance criteria for StockFlow.

It serves as the primary reference for application design, implementation, and testing.

### 1.2 Project Overview

StockFlow is an Inventory & Order Management System designed to help small businesses manage products, inventory, and order processing through a centralized application.

The initial release is designed for a single administrator role.

### 1.3 Problem Statement

Small businesses may rely on spreadsheets or manual records to manage inventory and orders. This can lead to inconsistent stock information, accidental overselling, incorrect order calculations, and limited traceability.

StockFlow aims to improve inventory accuracy and order management through controlled workflows and auditable stock records.

### 1.4 Project Objectives

- Centralize product management.
- Maintain accurate inventory quantities.
- Provide a consistent order lifecycle.
- Prevent negative stock.
- Record all stock changes.
- Track order status transitions.
- Maintain reliable and testable business operations.

## 2. Project Scope

### 2.1 In Scope

- Administrator authentication.
- Product management.
- Initial stock recording.
- Manual stock adjustments.
- Stock movement history.
- Order creation.
- Order confirmation.
- Order cancellation.
- Order shipping.
- Order status history.
- Dashboard summaries.
- Automated testing.
- Cloud deployment.

### 2.2 Out of Scope

- Online payments.
- Customer accounts.
- Multiple warehouses.
- Marketplace integration.
- WhatsApp integration.
- Mobile applications.
- AI stock forecasting.
- Returns and refunds.

## 3. User Roles

### 3.1 Administrator (ADMIN)

The administrator is the only user role in the MVP.

The administrator can:

- Authenticate and access the application.
- Manage products.
- Record initial stock.
- Adjust stock quantities.
- View stock movement history.
- Create and manage orders.
- View dashboard summaries.

## 4. Functional Requirements

### 4.1 Authentication

- FR-01: The system shall allow an administrator to log in.
- FR-02: The system shall allow an authenticated administrator to log out.
- FR-03: The system shall provide information about the currently authenticated administrator.
- FR-04: The system shall protect business operations from unauthenticated access.
- FR-05: The system shall maintain administrator sessions server-side in PostgreSQL with a fixed 12-hour expiration.
- FR-06: The system shall revoke the active session when the administrator logs out.
- FR-07: The system shall remove expired sessions after a successful login.

### 4.2 Product Management

- FR-08: The administrator shall be able to create products.
- FR-09: The administrator shall be able to view product lists and details.
- FR-10: The administrator shall be able to update product name, description, and price; SKU shall not be changed after product creation.
- FR-11: The administrator shall be able to deactivate products.
- FR-12: The system shall display current stock quantities.
- FR-13: The system shall not permanently delete products that are referenced by historical records.

### 4.3 Inventory Management

- FR-14: The system shall record positive initial stock as an INITIAL_STOCK movement.
- FR-15: The administrator shall be able to increase stock through manual adjustments.
- FR-16: The administrator shall be able to decrease stock through manual adjustments.
- FR-17: Manual stock adjustments shall require a non-empty reason.
- FR-18: The administrator shall be able to adjust stock for inactive products; product inactivity must not block the adjustment.
- FR-19: The system shall record every stock change in stock_movements.
- FR-20: The administrator shall be able to view stock movement history.

### 4.4 Order Management

- FR-21: The administrator shall be able to create orders.
- FR-22: Newly created orders shall have PENDING status.
- FR-23: Creating an order shall not deduct stock.
- FR-24: The system shall consolidate duplicate product IDs in an order request by summing their quantities.
- FR-25: The system shall obtain product prices from the database when creating an order.
- FR-26: The system shall preserve the unit price snapshot recorded at order creation.
- FR-27: The system shall calculate order totals on the server.
- FR-28: The system shall support idempotency keys for order creation requests.
- FR-29: The administrator shall be able to view order lists and details.

### 4.5 Order Confirmation

- FR-30: The administrator shall be able to confirm a PENDING order.
- FR-31: The system shall verify that every product in the order is active.
- FR-32: The system shall verify sufficient current stock for every order item.
- FR-33: The system shall deduct stock only when confirmation succeeds.
- FR-34: Stock deduction, stock movement creation, and order status changes shall be atomic.
- FR-35: Failed confirmation shall not leave partial stock changes.
- FR-36: The system shall prevent duplicate confirmation from deducting stock more than once.

### 4.6 Order Cancellation and Shipping

- FR-37: The administrator shall be able to cancel a PENDING order without changing stock; a non-empty cancellation reason is required.
- FR-38: The administrator shall be able to cancel a CONFIRMED order before shipment; a non-empty cancellation reason is required.
- FR-39: Cancelling a CONFIRMED order shall restore its reserved stock quantities.
- FR-40: Stock restoration and cancellation status changes shall be atomic.
- FR-41: The administrator shall be able to mark a CONFIRMED order as SHIPPED.
- FR-42: The system shall reject normal cancellation of SHIPPED orders.
- FR-43: Deactivating a product shall not prevent an already CONFIRMED order from being shipped.

### 4.7 Audit History

- FR-44: The system shall record order status transitions in order_status_history.
- FR-45: The system shall record the actor and timestamp for stock changes.
- FR-46: Historical stock movement and order status records shall not be editable through normal application workflows.

### 4.8 Dashboard

- FR-47: The system shall display relevant inventory and order summaries.
- FR-48: Dashboard information shall be derived from persisted application data.

## 5. Business Rules

- BR-01: Product SKU must be unique.
- BR-02: Products shall be deactivated rather than permanently deleted.
- BR-03: Product prices must be non-negative.
- BR-04: Stock quantities must never be negative.
- BR-05: Only ADMIN users may create orders.
- BR-06: Every new order starts with PENDING status.
- BR-07: Creating an order does not deduct stock.
- BR-08: Stock is deducted only after successful order confirmation.
- BR-09: Confirmation must validate current stock for all order items.
- BR-10: Confirmation must be atomic.
- BR-11: Order item prices are snapshots taken at order creation.
- BR-12: Pending orders can be cancelled without stock restoration and require a non-empty cancellation reason.
- BR-13: Confirmed orders can be cancelled before shipment, restoring stock atomically and requiring a non-empty cancellation reason.
- BR-14: Shipped orders cannot be cancelled through the normal MVP workflow.
- BR-15: Inactive products cannot be used in new orders or pending order confirmation.
- BR-16: Every stock change must produce a stock movement record.
- BR-17: Every order status transition must be recorded.
- BR-18: Initial stock greater than zero must produce an INITIAL_STOCK movement.
- BR-19: Zero initial stock does not require a zero-quantity movement.
- BR-20: Manual stock adjustments require a reason.
- BR-26: Manual stock adjustments are allowed for inactive products.
- BR-21: Duplicate product IDs in an order request must be consolidated by summing quantities.
- BR-22: A deactivated product does not prevent shipping an already CONFIRMED order.
- BR-23: Repeated order creation requests with the same idempotency key and identical payload must not create duplicate orders.
- BR-24: Reusing an idempotency key with a different payload must result in a conflict.
- BR-25: A confirmed order may only be cancelled or shipped once through valid state transitions.

## 6. Non-Functional Requirements

### 6.1 Security

- NFR-01: Passwords must be stored using secure password hashing.
- NFR-02: Business endpoints must enforce server-side authentication and authorization.
- NFR-03: Secrets must not be committed to version control.
- NFR-04: Session tokens must use secure cookie practices, and sessions must be stored server-side in PostgreSQL with a fixed 12-hour expiration and immediate revocation on logout.
- NFR-05: Client-supplied prices and actor identities must not be trusted.

### 6.2 Data Integrity

- NFR-06: Stock quantities must never become negative.
- NFR-07: Database constraints must enforce unique SKUs and valid quantities.
- NFR-08: Financial values must use precise decimal storage.
- NFR-09: Critical inventory operations must use database transactions.
- NFR-10: Concurrent inventory operations must preserve stock consistency.
- NFR-11: Retried requests must not duplicate business operations.

### 6.3 Maintainability

- NFR-12: The application shall follow a modular monolith architecture.
- NFR-13: Business rules shall be separated from presentation concerns.
- NFR-14: Database schema changes shall use versioned migrations.
- NFR-15: Project documentation shall be maintained alongside the application.

### 6.4 Testability

- NFR-16: Critical business rules shall have automated tests.
- NFR-17: Inventory transactions shall have rollback and concurrency tests.
- NFR-18: Main administrator workflows shall have end-to-end tests.

### 6.5 Operational Reliability

- NFR-19: Production secrets shall be managed outside source control.
- NFR-20: Database backup and recovery procedures shall be documented.
- NFR-21: Application errors shall be logged without exposing sensitive information.

## 7. Order State Model

Allowed transitions:

| Current Status | Action  | New Status |
| -------------- | ------- | ---------- |
| PENDING        | Confirm | CONFIRMED  |
| PENDING        | Cancel  | CANCELLED  |
| CONFIRMED      | Ship    | SHIPPED    |
| CONFIRMED      | Cancel  | CANCELLED  |

All other transitions are rejected through the normal MVP workflow.

## 8. Stock Movement Types

| Movement Type   | Meaning                              |
| --------------- | ------------------------------------ |
| INITIAL_STOCK   | Initial inventory recording          |
| ORDER_CONFIRMED | Stock deduction after confirmation   |
| ORDER_CANCELLED | Stock restoration after cancellation |
| ADJUSTMENT_IN   | Manual stock increase                |
| ADJUSTMENT_OUT  | Manual stock decrease                |

Each stock movement shall record the product, quantity delta, stock before, stock after, actor, timestamp, and applicable order reference.

Manual adjustments must also record a reason.

## 9. Acceptance Criteria

### 9.1 Product Management

- A product cannot be created with a duplicate SKU.
- Product prices and initial stock cannot be negative.
- Deactivation preserves historical references.

### 9.2 Initial Stock

- Positive initial stock generates an INITIAL_STOCK movement.
- The movement records stock before as zero and stock after as the initial quantity.
- Zero initial stock does not generate a zero movement.

### 9.3 Order Creation

- A new order starts with PENDING status.
- Creating an order does not change stock.
- Duplicate product IDs are consolidated.
- Product prices are obtained from the database.
- The server calculates the order total.
- Repeated identical idempotency requests return the original result.

### 9.4 Order Confirmation

- All products must be active.
- Every item must have sufficient stock.
- Stock deductions and audit records are atomic.
- Failed confirmation does not change any product stock.
- Concurrent confirmations cannot produce negative stock or duplicate deductions.

### 9.5 Cancellation and Shipping

- Pending cancellation does not change stock.
- Confirmed cancellation restores stock exactly once.
- Shipped orders cannot be cancelled through normal workflow.
- A confirmed order remains eligible for shipping after product deactivation.

### 9.6 Stock Adjustment

- An adjustment requires a reason.
- Stock cannot become negative.
- Stock and movement records are committed atomically.

## 10. MVP Success Criteria

The MVP is considered successful when:

- An administrator can manage products.
- Initial stock and manual adjustments are auditable.
- Orders can be created, confirmed, cancelled, and shipped.
- Inventory remains consistent across operations.
- Duplicate order creation requests are handled safely.
- Critical business rules pass automated tests.
- The application is deployed to a cloud environment.

## 11. Future Enhancements

Potential future capabilities include:

- Multiple administrators and roles.
- Multiple warehouses.
- Customer management.
- Returns and refunds.
- Payment integration.
- Reporting and forecasting.
