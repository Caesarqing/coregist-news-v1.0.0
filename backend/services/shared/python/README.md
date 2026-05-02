# Shared Python Modules

This package is the target location for backend-wide Python shared code.

## Intended contents
- settings
- queue helpers
- LLM client/provider helpers
- agent and skill registry helpers
- news identity utilities
- RSS ingestion helpers

## Migration strategy
- Add package-level re-export modules first
- Move callers gradually
- Keep root modules as compatibility shims until all imports are updated
