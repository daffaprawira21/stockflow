# StockFlow

**Inventory & Order Management System**

StockFlow is a full-stack inventory and order management system designed to help small businesses manage products, monitor stock levels, and process orders consistently.

This project is being developed as a software engineering learning project and developer portfolio, with an emphasis on requirements engineering, system design, database integrity, testing, and deployment.

> **Project status: Planning & Foundation**
>
> The requirements and initial technical designs have been reviewed. Application features are not yet implemented.

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Objectives](#objectives)
- [Scope and Features](#scope-and-features)
- [Business Rules](#business-rules)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Database Overview](#database-overview)
- [Project Structure](#project-structure)
- [Development Roadmap](#development-roadmap)
- [Testing Strategy](#testing-strategy)
- [Documentation](#documentation)
- [License](#license)

## Overview

StockFlow provides a centralized system for managing inventory and order operations.

The application is designed around an admin-managed workflow:

1. Admin manages product information.
2. Admin records initial stock.
3. Admin creates customer orders.
4. Orders remain pending until confirmed.
5. Stock is deducted when an order is confirmed.
6. Admin can cancel eligible orders or mark confirmed orders as shipped.
7. Every stock change and order status transition is recorded.

## Problem Statement

Small businesses may manage inventory and orders using spreadsheets or manual records.

This can lead to:

- Inconsistent stock information.
- Accidental overselling.
- Incorrect order calculations.
- Difficulty tracking inventory changes.
- Limited visibility into order status.
- Lack of reliable historical records.

StockFlow aims to address these problems through centralized inventory management, controlled order workflows, and auditable stock movements.

## Objectives

- Centralize product and inventory management.
- Maintain accurate stock quantities.
- Provide a consistent order lifecycle.
- Prevent negative inventory.
- Record every stock movement.
- Maintain order status history.
- Apply reliable database transaction handling.
- Demonstrate software engineering practices throughout the SDLC.

## Scope and Features

### MVP Features

| Module         | Planned capabilities                            |
| -------------- | ----------------------------------------------- |
| Authentication | Admin login and logout                          |
| Products       | Create, view, update, deactivate products       |
| Inventory      | Initial stock, stock adjustments, stock history |
| Orders         | Create, confirm, cancel, and ship orders        |
| Dashboard      | Inventory and order summaries                   |
| Audit          | Stock movements and order status history        |

### Out of Scope

The following features are excluded from the initial MVP:

- Online payment integration.
- Customer accounts.
- Multiple warehouses.
- Marketplace integration.
- WhatsApp integration.
- Mobile applications.
- AI-based stock forecasting.
- Returns and refunds.

## Business Rules

1. Only administrators can create orders.
2. Every new order starts with `PENDING` status.
3. Creating an order does not deduct inventory.
4. Stock is deducted only when an order is confirmed.
5. Confirmation requires sufficient stock for every order item.
6. Confirmation must be atomic: either all stock changes succeed or none do.
7. Inactive products cannot be used in new orders or pending order confirmation.
8. Already confirmed orders can still be shipped if a product is subsequently deactivated.
9. Pending orders can be cancelled without changing stock.
10. Confirmed orders can be cancelled before shipment, restoring their stock.
11. Shipped orders cannot be cancelled through the normal MVP workflow.
12. Initial stock must be recorded as a stock movement.
13. Manual stock adjustments require a reason.
14. Duplicate products in an order request are consolidated into one item.
15. Order item prices are snapshots taken when the order is created.
16. Every stock change must have an audit record.
17. Every order status transition must be recorded.
18. Repeated order creation requests are protected using idempotency keys.

## Technology Stack

| Area                         | Technology     |
| ---------------------------- | -------------- |
| Frontend and Backend         | Next.js        |
| Programming Language         | TypeScript     |
| Database                     | PostgreSQL     |
| ORM                          | Prisma         |
| Validation                   | Zod            |
| Unit and Integration Testing | Vitest         |
| End-to-End Testing           | Playwright     |
| Version Control              | Git and GitHub |
| Continuous Integration       | GitHub Actions |
| Deployment                   | Cloud hosting  |

Technology selections are subject to review as implementation progresses.

## Architecture Overview

StockFlow follows a **Modular Monolith** architecture.

The application is organized into distinct responsibility layers:

1. Presentation Layer — user interface.
2. API Layer — HTTP requests and authentication.
3. Validation Layer — request validation.
4. Application Layer — use case orchestration.
5. Domain Layer — business rules.
6. Data Access Layer — database operations.
7. Database — persistent application data.

### Core Modules

- Auth
- Products
- Inventory
- Orders
- Dashboard

The modular monolith approach keeps the initial system manageable while maintaining clear boundaries between business responsibilities.

## Database Overview

The initial database design includes:

| Entity               | Responsibility                  |
| -------------------- | ------------------------------- |
| Users                | Administrator accounts          |
| Products             | Product information and stock   |
| Orders               | Order information               |
| Order Items          | Products within an order        |
| Stock Movements      | Inventory change history        |
| Order Status History | Order status transition history |
| Idempotency Records  | Duplicate request protection    |

PostgreSQL is the primary source of truth for application data.

Database transactions and integrity constraints will be used to protect inventory consistency.

## Project Structure

The planned project structure is:

```text
stockflow/
├── app/
├── components/
├── modules/
│   ├── auth/
│   ├── products/
│   ├── inventory/
│   └── orders/
├── lib/
├── prisma/
├── tests/
├── docs/
│   ├── requirements/
│   ├── architecture/
│   ├── database/
│   ├── api/
│   ├── testing/
│   └── project/
├── public/
├── README.md
├── LICENSE
└── package.json
```

This is the target structure and will be established incrementally during implementation.

## Development Roadmap

| Sprint   | Focus                                  | Status      |
| -------- | -------------------------------------- | ----------- |
| Sprint 0 | Project Foundation                     | In Progress |
| Sprint 1 | Database Foundation and Authentication | Planned     |
| Sprint 2 | Product Management                     | Planned     |
| Sprint 3 | Inventory Management                   | Planned     |
| Sprint 4 | Order Management                       | Planned     |
| Sprint 5 | Frontend and Dashboard                 | Planned     |
| Sprint 6 | Testing and Deployment                 | Planned     |

## Testing Strategy

StockFlow will use multiple testing levels:

- **Unit Testing:** business rules and calculations.
- **Integration Testing:** API, database, and transaction behavior.
- **End-to-End Testing:** complete administrator workflows.
- **Concurrency Testing:** simultaneous inventory operations.
- **Rollback Testing:** ensuring failed operations do not partially change stock.

Critical scenarios include insufficient inventory, duplicate order requests, inactive products, repeated cancellation requests, and concurrent order confirmation.

## Documentation

Project documentation will be maintained under the `docs/` directory.

Planned documents:

- Software Requirements Specification (SRS).
- Architecture Design Document.
- Database Design Document.
- API Contract.
- Testing Strategy.
- Implementation Plan.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
