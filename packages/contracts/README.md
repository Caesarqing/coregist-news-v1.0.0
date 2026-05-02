# @coregist/contracts

Shared API contracts for CoreGist News.

## Current scope
- auth DTOs
- user/profile/settings DTOs
- news DTOs
- tracking DTOs
- AI search DTOs
- agent/skill config DTOs
- API path constants

## Intended consumers
- `frontend/` Web client
- future native app client
- backend gateway/service adapters

## Migration note
This package is now the source-of-truth target for repeated frontend DTOs.
The current frontend still contains duplicated local types and should be migrated gradually.
