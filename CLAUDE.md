# CLAUDE.md

This file provides guidance on working within the SynapsisForge Project Plan repository. This repo is a tracking and planning mechanism for the main SynapsisForge project; it does not contain the source code for the application itself. Use this file to document processes, conventions, and overall project structure guidelines when planning work.

## Repository Purpose
This repository's primary function is to track progress, store architectural decisions, and define development standards for the SynapsisForge system across its various services.

## Development Workflow Guidelines
The following commands/patterns guide how we manage tasks *within* this plan tracker:

*   **Planning:** Use Plan Mode (`EnterPlanMode`) when designing new features or major refactors to ensure all stakeholders agree on the steps before coding begins.
*   **Tracking:** Utilize the Task tools (`TaskCreate`, `TaskList`, etc.) to maintain a clear, visible record of work items, dependencies, and owners.
*   **Review:** When code is ready for review, follow standard commit and PR workflows.

## Project Conventions & Patterns (For Reference)
While the actual service implementations are external, we should keep the following architectural standards in mind when planning any feature:
*   **Architecture:** The target system follows a microservice-oriented pattern with an API Gateway coordinating services via synchronous REST/gRPC and asynchronous message queues.
*   **Authentication:** All planned endpoints must adhere to JWT validation passed via the `Authorization` header.
*   **Error Handling:** Plan for standard error responses: `{ "error": "...", "code": 4xx }`.
*   **Versioning:** Plan for API versioning in URIs (e.g., `/v1/users`, `/v2/users`).

---

