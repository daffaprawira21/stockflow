# StockFlow — API Contract Document

**Document Version:** 1.0
**Status:** Draft
**Project:** StockFlow
**Document Type:** API Contract

---

# 1. Introduction

## 1.1 Purpose

This document defines the REST API contract for StockFlow, an Inventory and Order Management System.

It describes API endpoints, HTTP methods, request parameters, request bodies, response formats, validation rules, authentication, authorization, and error handling.

This document serves as the communication contract between the frontend and backend application.

## 1.2 API Design Goals

The API is designed to:

- Provide consistent communication between frontend and backend.
- Enforce authentication and authorization.
- Validate all incoming requests.
- Preserve inventory and order data integrity.
- Support predictable error handling.
- Prevent duplicate order creation.
- Support efficient data retrieval through pagination.

## 1.3 API Standards

| Area            | Standard             |
| --------------- | -------------------- |
| Architecture    | REST API             |
| Base Path       | `/api`               |
| Versioning      | Unversioned          |
| Request Format  | JSON                 |
| Response Format | JSON                 |
| Authentication  | Cookie-based session |
| Authorization   | ADMIN                |
| Validation      | Zod                  |
| Identifier      | UUID                 |
| Pagination      | Offset pagination    |
| Monetary Values | Decimal strings      |

---

# 2. General API Conventions

## 2.1 Base URL

Development:

`http://localhost:3000/api`

Production:

`https://<production-domain>/api`

## 2.2 HTTP Methods

| Method | Purpose                                          |
| ------ | ------------------------------------------------ |
| GET    | Retrieve resources                               |
| POST   | Create resources or execute business actions     |
| PATCH  | Partially update resources                       |
| DELETE | Not used for normal deletion of business records |

## 2.3 Request Headers

Standard request headers:

```http
Content-Type: application/json
Accept: application/json
```

Authenticated requests must include the session cookie automatically through the browser.

### CSRF decision

For the MVP, a CSRF token mechanism is not implemented.

Because authentication uses cookies, state-changing requests remain a security-sensitive area. The implementation must use appropriate cookie settings and origin checks. SameSite cookie configuration alone must not be treated as a complete CSRF defense.

GET requests must not perform business state changes.

Order creation must additionally include:

```http
Idempotency-Key: <unique-client-generated-key>
```

The key must be unique for each new logical order creation attempt.

## 2.4 Response Format

### Success Response

```json
{
  "success": true,
  "data": {},
  "meta": null
}
```

Single-resource responses use `meta: null`.

### Paginated Success Response

List endpoints use the following pagination metadata:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 45,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": []
  }
}
```

## 2.5 HTTP Status Codes

| Status | Meaning                                              |
| ------ | ---------------------------------------------------- |
| 200    | Request successful                                   |
| 201    | Resource successfully created                        |
| 400    | Invalid request                                      |
| 401    | Authentication required or invalid                   |
| 403    | Authenticated user is not authorized                 |
| 404    | Resource not found                                   |
| 409    | Business conflict or idempotency conflict            |
| 422    | Business rule validation failure                     |
| 429    | Too many requests; reserved for future rate limiting |
| 500    | Internal server error                                |

## 2.6 Error Codes

| Error Code                        | HTTP Status | Description                                    |
| --------------------------------- | ----------: | ---------------------------------------------- |
| `VALIDATION_ERROR`                |         400 | Invalid request structure or input             |
| `UNAUTHENTICATED`                 |         401 | Missing or invalid session                     |
| `FORBIDDEN`                       |         403 | Insufficient permissions                       |
| `RESOURCE_NOT_FOUND`              |         404 | Requested resource does not exist              |
| `SKU_ALREADY_EXISTS`              |         409 | Duplicate product SKU                          |
| `ORDER_CONFLICT`                  |         409 | Invalid order state transition                 |
| `IDEMPOTENCY_CONFLICT`            |         409 | Same key used with different payload           |
| `IDEMPOTENCY_REQUEST_IN_PROGRESS` |         409 | Same key and payload currently being processed |
| `PRODUCT_INACTIVE`                |         422 | Product is inactive                            |
| `INSUFFICIENT_STOCK`              |         422 | Available stock is insufficient                |
| `INVALID_ORDER_STATE`             |         422 | Requested operation is not allowed             |
| `INVALID_ADJUSTMENT`              |         422 | Invalid inventory adjustment                   |
| `INTERNAL_SERVER_ERROR`           |         500 | Unexpected server failure                      |

Sensitive internal errors must not be exposed to clients.

The MVP does not implement login rate limiting. Therefore, `429 RATE_LIMITED` is reserved for future use and is not an expected login response in the MVP.

---

# 3. Authentication and Authorization

## 3.1 Authentication Strategy

StockFlow uses cookie-based session authentication.

After successful login, the server creates an authenticated session and sends a session cookie.

The cookie must use:

- HttpOnly.
- Secure in production.
- SameSite protection.
- Appropriate expiration.
- Server-side session validation.

Session tokens must not be stored in browser localStorage.

## 3.2 Authorization

The MVP supports one role:

`ADMIN`

All protected business endpoints require an authenticated administrator.

Authorization must be enforced on the server side.

Frontend route protection alone is not sufficient.

## 3.3 CSRF Protection

The MVP does not implement a CSRF token mechanism.

Because the application uses cookie-based authentication, state-changing requests must still be handled carefully.

The implementation must:

- Configure the session cookie appropriately.
- Validate request origin where applicable.
- Avoid state changes through GET requests.
- Treat cookie SameSite settings as one layer of protection, not a complete CSRF defense.

A dedicated CSRF mechanism may be reconsidered before public production deployment.

## 3.4 Session Expiration

Expired or invalid sessions must return:

HTTP 401 — `UNAUTHENTICATED`.

The client must redirect the administrator to the login interface when appropriate.

---

# 4. Pagination and Filtering

List endpoints support offset pagination.

## 4.1 Pagination Parameters

| Parameter | Type    | Default | Rule                      |
| --------- | ------- | ------: | ------------------------- |
| `page`    | Integer |       1 | Must be >= 1              |
| `limit`   | Integer |      10 | Must be between 1 and 100 |

Example:

`GET /api/products?page=1&limit=10`

## 4.2 Pagination Response

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 45,
    "totalPages": 5
  }
}
```

List endpoints must use deterministic ordering to avoid unpredictable pagination results.

---

# 5. Authentication Endpoints

## 5.1 Login

**Endpoint:** `POST /api/auth/login`

Authentication: Not required.

Request:

```json
{
  "email": "admin@example.com",
  "password": "example-password"
}
```

Validation:

- Email must be valid.
- Password must not be empty.

Success: HTTP 200.

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@example.com",
      "role": "ADMIN"
    }
  },
  "meta": null
}
```

The server also sets the session cookie through the HTTP response.

Invalid credentials return HTTP 401.

The API must not reveal whether the email or password was incorrect.

### Login rate limiting

Login rate limiting is not implemented in the MVP.

This is a deliberate scope simplification and a security limitation to revisit before public production deployment.

## 5.2 Logout

**Endpoint:** `POST /api/auth/logout`

Authentication: Required.

Request body: None.

Success: HTTP 200.

Response:

```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out"
  },
  "meta": null
}
```

The server invalidates the session and clears the session cookie.

## 5.3 Get Current User

**Endpoint:** `GET /api/auth/me`

Authentication: Required.

Success: HTTP 200.

Response:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@example.com",
    "role": "ADMIN"
  },
  "meta": null
}
```

---

# 6. Product Endpoints

## 6.1 List Products

**Endpoint:** `GET /api/products`

Authentication: Required.

Query parameters:

| Parameter   | Type    | Required |
| ----------- | ------- | -------- |
| `page`      | Integer | No       |
| `limit`     | Integer | No       |
| `search`    | String  | No       |
| `isActive`  | Boolean | No       |
| `sortBy`    | String  | No       |
| `sortOrder` | String  | No       |

Allowed sort fields:

- `name`
- `sku`
- `price`
- `stock`
- `createdAt`

Allowed sort orders:

- `asc`
- `desc`

Success: HTTP 200.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "sku": "PRD-001",
      "name": "Wireless Mouse",
      "description": "Wireless computer mouse",
      "price": "150000.00",
      "stock": 50,
      "isActive": true,
      "createdAt": "2026-10-30T08:00:00.000Z",
      "updatedAt": "2026-10-30T08:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

## 6.2 Create Product

**Endpoint:** `POST /api/products`

Authentication: Required.

Request:

```json
{
  "sku": "PRD-001",
  "name": "Wireless Mouse",
  "description": "Wireless computer mouse",
  "price": "150000.00",
  "initialStock": 50
}
```

Validation:

- SKU is required and unique.
- Name is required.
- Price must be a valid nonnegative decimal.
- Initial stock must be a nonnegative integer.
- Description is optional.

Business rules:

- Product starts with `isActive = true`.
- Initial stock is stored in `products.stock`.
- If initial stock is greater than zero, create an `INITIAL_STOCK` movement.
- If initial stock is zero, no zero-quantity movement is created.
- Product creation and initial stock movement must be atomic.

Success: HTTP 201.

Response:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "sku": "PRD-001",
    "name": "Wireless Mouse",
    "price": "150000.00",
    "stock": 50,
    "isActive": true
  },
  "meta": null
}
```

Duplicate SKU returns HTTP 409 with `SKU_ALREADY_EXISTS`.

## 6.3 Get Product Detail

**Endpoint:** `GET /api/products/:id`

Authentication: Required.

Path parameter:

- `id`: Product UUID.

Success: HTTP 200.

Response:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "sku": "PRD-001",
    "name": "Wireless Mouse",
    "description": "Wireless computer mouse",
    "price": "150000.00",
    "stock": 50,
    "isActive": true,
    "createdAt": "2026-10-30T08:00:00.000Z",
    "updatedAt": "2026-10-30T08:00:00.000Z"
  },
  "meta": null
}
```

## 6.4 Update Product

**Endpoint:** `PATCH /api/products/:id`

Authentication: Required.

Request:

```json
{
  "name": "Wireless Mouse Pro",
  "description": "Updated product description",
  "price": "175000.00"
}
```

Rules:

- Only provided fields are updated.
- SKU must remain unique if SKU updates are supported.
- Price cannot be negative.
- Stock cannot be modified through this endpoint.
- Inventory changes must use the Inventory module.
- Product updates must not modify existing order item price snapshots.

Success: HTTP 200.

## 6.5 Deactivate Product

**Endpoint:** `PATCH /api/products/:id/deactivate`

Authentication: Required.

Request body: None.

Business rules:

- Set `isActive = false`.
- Do not physically delete the product.
- Inactive products cannot be included in new orders.
- Inactive products cannot be used to confirm pending orders.
- Already confirmed orders can still be shipped.

Success: HTTP 200.

---

# 7. Inventory Endpoints

## 7.1 List Inventory

**Endpoint:** `GET /api/inventory`

Authentication: Required.

Query parameters:

- `page`
- `limit`
- `search`
- `lowStock`

Success: HTTP 200.

Response:

```json
{
  "success": true,
  "data": [
    {
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "sku": "PRD-001",
      "productName": "Wireless Mouse",
      "stock": 50,
      "isActive": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

## 7.2 Get Stock Movements

**Endpoint:** `GET /api/inventory/:productId/movements`

Authentication: Required.

Query parameters:

- `page`
- `limit`
- `movementType`

Success: HTTP 200.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "productId": "550e8400-e29b-41d4-a716-446655440001",
      "movementType": "ORDER_CONFIRMATION",
      "quantityDelta": -5,
      "quantityBefore": 50,
      "quantityAfter": 45,
      "orderId": "550e8400-e29b-41d4-a716-446655440002",
      "reason": null,
      "createdAt": "2026-10-30T08:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

## 7.3 Adjust Inventory

**Endpoint:** `POST /api/inventory/adjustments`

Authentication: Required.

Request:

```json
{
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "ADJUSTMENT_IN",
  "quantity": 10,
  "reason": "Additional stock received"
}
```

Allowed types:

- `ADJUSTMENT_IN`
- `ADJUSTMENT_OUT`

Validation:

- Product ID must be a valid UUID.
- Quantity must be a positive integer.
- Reason must not be empty.
- Product must exist.
- Resulting stock must not be negative.

Business rules:

- Inventory Application Service owns the transaction.
- Update `products.stock`.
- Insert the corresponding stock movement.
- Both operations must succeed or roll back together.

Success: HTTP 201.

Response:

```json
{
  "success": true,
  "data": {
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "movementType": "ADJUSTMENT_IN",
    "quantityDelta": 10,
    "quantityBefore": 50,
    "quantityAfter": 60
  },
  "meta": null
}
```

---

# 8. Order Endpoints

## 8.1 List Orders

**Endpoint:** `GET /api/orders`

Authentication: Required.

Query parameters:

| Parameter   | Type                         |
| ----------- | ---------------------------- |
| `page`      | Integer                      |
| `limit`     | Integer                      |
| `status`    | Order status                 |
| `search`    | String                       |
| `sortBy`    | `createdAt` or `orderNumber` |
| `sortOrder` | `asc` or `desc`              |

Success: HTTP 200.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "orderNumber": "ORD-2026-0001",
      "status": "PENDING",
      "totalAmount": "300000.00",
      "createdAt": "2026-10-30T08:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

## 8.2 Create Order

**Endpoint:** `POST /api/orders`

Authentication: Required.

Required header:

```http
Idempotency-Key: <unique-client-generated-key>
```

Request:

```json
{
  "items": [
    {
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "quantity": 2
    },
    {
      "productId": "550e8400-e29b-41d4-a716-446655440001",
      "quantity": 3
    }
  ]
}
```

Validation:

- Items must not be empty.
- Product IDs must be valid UUIDs.
- Quantities must be positive integers.
- Products must exist and be active.
- Duplicate product IDs must be consolidated by summing quantities.

Business rules:

- Capture current product prices at order creation.
- Store price snapshots in `order_items`.
- Calculate subtotals and total amount.
- New order status is `PENDING`.
- Stock is not deducted during order creation.
- Create initial order status history.
- Persist the idempotency record and order result atomically.

Success: HTTP 201.

Response:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "orderNumber": "ORD-2026-0001",
    "status": "PENDING",
    "items": [
      {
        "productId": "550e8400-e29b-41d4-a716-446655440000",
        "quantity": 2,
        "unitPrice": "150000.00",
        "subtotal": "300000.00"
      }
    ],
    "totalAmount": "300000.00"
  },
  "meta": null
}
```

### Idempotency Behavior

The idempotency scope is the authenticated user, operation, and idempotency key.

Same key and same payload, after the original request has completed:

- Return the original operation result.
- Do not create another order.
- A replay may return HTTP 200.

Same key and different payload:

- Return HTTP 409.
- Error code: `IDEMPOTENCY_CONFLICT`.

Same key and same payload while the original request is still processing:

- Return HTTP 409.
- Error code: `IDEMPOTENCY_REQUEST_IN_PROGRESS`.
- The client must retry using the same key.

Concurrent requests using the same key must not create duplicate orders.

## 8.3 Get Order Detail

**Endpoint:** `GET /api/orders/:id`

Authentication: Required.

Success: HTTP 200.

Response:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "orderNumber": "ORD-2026-0001",
    "status": "PENDING",
    "totalAmount": "300000.00",
    "items": [],
    "statusHistory": [],
    "createdAt": "2026-10-30T08:00:00.000Z"
  },
  "meta": null
}
```

The detail response must include the stored price snapshots, not the current product prices.

## 8.4 Confirm Order

**Endpoint:** `POST /api/orders/:id/confirm`

Authentication: Required.

Request body: None.

Business rules:

- Order must be `PENDING`.
- All products must be active.
- Latest stock quantities must be sufficient.
- Deduct stock for all order items.
- Record `ORDER_CONFIRMATION` movements.
- Update status to `CONFIRMED`.
- Record order status history.
- Execute all operations in one transaction coordinated by Orders Application Service.

Success: HTTP 200.

Response:

```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440002",
    "status": "CONFIRMED",
    "confirmedAt": "2026-10-30T09:00:00.000Z"
  },
  "meta": null
}
```

Possible errors:

- 404 `RESOURCE_NOT_FOUND`.
- 409 `ORDER_CONFLICT`.
- 422 `PRODUCT_INACTIVE`.
- 422 `INSUFFICIENT_STOCK`.

## 8.5 Cancel Order

**Endpoint:** `POST /api/orders/:id/cancel`

Authentication: Required.

Request:

```json
{
  "reason": "Customer requested cancellation"
}
```

Validation:

- `reason` is required.
- `reason` must not be empty.

Business rules:

### For PENDING orders

- Change status to `CANCELLED`.
- Record status history, including the cancellation reason.
- Do not change stock.

### For CONFIRMED orders

- Restore stock.
- Create `ORDER_CANCELLATION` movements.
- Change status to `CANCELLED`.
- Record status history, including the cancellation reason.
- Execute all changes atomically.

### For SHIPPED orders

- Reject cancellation through the normal MVP workflow.

Success: HTTP 200.

Response:

```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440002",
    "status": "CANCELLED",
    "cancelledAt": "2026-10-30T09:30:00.000Z"
  },
  "meta": null
}
```

## 8.6 Ship Order

**Endpoint:** `POST /api/orders/:id/ship`

Authentication: Required.

Request body: None.

Business rules:

- Order must be `CONFIRMED`.
- Update status to `SHIPPED`.
- Record order status history.
- Do not modify inventory.
- Inactive products do not prevent shipment of an already confirmed order.

Success: HTTP 200.

Response:

```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440002",
    "status": "SHIPPED",
    "shippedAt": "2026-10-30T10:00:00.000Z"
  },
  "meta": null
}
```

---

# 9. Dashboard Endpoint

## 9.1 Get Dashboard Summary

**Endpoint:** `GET /api/dashboard/summary`

Authentication: Required.

Success: HTTP 200.

Response:

```json
{
  "success": true,
  "data": {
    "totalProducts": 120,
    "activeProducts": 110,
    "totalOrders": 250,
    "pendingOrders": 15,
    "confirmedOrders": 20,
    "shippedOrders": 200,
    "cancelledOrders": 15,
    "totalInventoryUnits": 1500
  },
  "meta": null
}
```

The dashboard must retrieve information through appropriate application services and must not bypass business rules.

---

# 10. Validation Strategy

All incoming requests must be validated using Zod before business processing.

Validation responsibilities include:

- Request body validation.
- Query parameter validation.
- Path parameter validation.
- UUID validation.
- Enum validation.
- String length validation.
- Numeric range validation.
- Required field validation.

TypeScript types alone are not sufficient for runtime validation.

The server must treat all client input as untrusted.

Validation failures must return a consistent error response.

---

# 11. Error Handling

## 11.1 Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient stock for one or more products",
    "details": [
      {
        "productId": "550e8400-e29b-41d4-a716-446655440000",
        "requestedQuantity": 10,
        "availableQuantity": 5
      }
    ]
  }
}
```

## 11.2 Error Handling Principles

- Never expose database credentials.
- Never expose raw SQL errors.
- Never expose password hashes or session secrets.
- Log unexpected errors securely.
- Return meaningful client-safe messages.
- Preserve transaction integrity when an operation fails.
- Use appropriate HTTP status codes.

---

# 12. Security Requirements

The API must enforce:

1. Authentication on all protected endpoints.
2. Server-side ADMIN authorization.
3. Appropriate protection for cookie-authenticated state-changing requests.
4. Input validation using Zod.
5. Secure session cookie configuration.
6. Safe error responses.
7. Secure handling of credentials and secrets.
8. No direct exposure of internal database structures.
9. Server-side validation of all business-critical operations.

Login rate limiting is not implemented in the MVP.

CSRF token protection is not implemented in the MVP. Cookie settings and origin checks must be handled carefully, and this limitation must be revisited before public production deployment.

---

# 13. API Testing Requirements

The following API scenarios must be tested.

## 13.1 Authentication

- Successful login.
- Invalid credentials.
- Expired session.
- Logout.
- Unauthorized access.

## 13.2 Products

- Create product.
- Reject duplicate SKU.
- Reject negative price.
- Reject negative initial stock.
- Update product.
- Deactivate product.
- List products with search.
- List products with active status filter.
- List products with sorting and pagination.

## 13.3 Inventory

- View inventory.
- View inventory with search.
- View low-stock inventory.
- View stock movement history.
- Filter stock movement history by movement type.
- Increase stock.
- Decrease stock.
- Reject negative resulting stock.
- Reject adjustment without reason.
- Verify stock update and movement record are atomic.

## 13.4 Orders

- Create order.
- Consolidate duplicate product IDs.
- Preserve price snapshot.
- Confirm order.
- Reject insufficient stock.
- Reject inactive products.
- Cancel pending order.
- Cancel confirmed order.
- Require cancellation reason.
- Reject cancellation of shipped order.
- Ship confirmed order.
- Verify shipped order does not modify inventory.

## 13.5 Idempotency

- Same key and same payload after completion.
- Same key and different payload.
- Concurrent requests using the same key and payload.
- Request while original operation is in progress.
- Retry using the same key.
- Verify no duplicate orders are created.

## 13.6 Security

- Unauthenticated requests.
- Invalid input.
- Unauthorized operations.
- Cookie configuration.
- Origin validation for state-changing requests.
- Verify login rate limiting is not part of MVP acceptance criteria.

---

# 14. API Design Decisions Summary

| Area                    | Decision                                                     |
| ----------------------- | ------------------------------------------------------------ |
| API Architecture        | REST                                                         |
| Base Path               | `/api`                                                       |
| Versioning              | Unversioned                                                  |
| Authentication          | Cookie-based session                                         |
| Authorization           | ADMIN                                                        |
| Request Format          | JSON                                                         |
| Response Format         | JSON                                                         |
| Validation              | Zod                                                          |
| Pagination              | Offset                                                       |
| Pagination Metadata     | `page`, `limit`, `totalItems`, `totalPages`                  |
| Identifier              | UUID                                                         |
| Monetary Values         | Decimal strings                                              |
| Error Format            | Standard JSON error envelope                                 |
| Order Creation          | `Idempotency-Key` header                                     |
| Idempotency In Progress | HTTP 409                                                     |
| Cancellation            | Reason required                                              |
| State-changing Requests | Cookie configuration and origin checks; no CSRF token in MVP |
| Login Rate Limiting     | Not implemented in MVP                                       |

---

# 15. References

- Software Requirements Specification: `docs/requirements/srs.md`
- System Architecture: `docs/architecture/architecture.md`
- Database Design: `docs/database/database-design.md`
- Testing Strategy: `docs/testing/testing-strategy.md`

---

**End of Document**
