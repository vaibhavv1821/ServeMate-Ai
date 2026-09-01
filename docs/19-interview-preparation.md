# 19 - Interview Preparation Guide

**Current Phase Focus**: Phase 1 Core Concepts

---

## Phase 1 Interview Questions & Answers

### Q1: Why did you choose a Modular Monolith over Microservices for ServMate?
**Answer**:  
For a project of this scope, microservices introduce unnecessary operational complexity (network latency, distributed tracing, complex deployment pipelines, independent service deployments). A Modular Monolith allows us to organize code by domain modules (`auth`, `users`, `providers`, `bookings`) within a single codebase. It provides high cohesion and clean module separation while maintaining single-command compilation and deployment. If a single domain requires independent scaling in the future, its clean boundary makes extraction straight-forward.

### Q2: Why use JavaScript with ES Modules instead of CommonJS (`require`)?
**Answer**:  
ES Modules (`import/export`) represent the modern ECMAScript standard supported natively by Node.js. It enables static module analysis, cleaner syntax, tree-shaking capabilities, and better alignment with front-end build pipelines like Vite.

### Q3: Why handle errors using a Centralized Error Handler?
**Answer**:  
Centralized error handling ensures all runtime exceptions (Zod validation errors, database constraints, operational AppErrors) produce uniform, predictable HTTP error responses (`{ status, message, errors }`) without leaking internal stack traces in production. It eliminates duplicate try/catch code across controllers.
