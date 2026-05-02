# AI Library Guide

## Current State

The backend now supports a file-first AI library under `backend/ai/`.

- Default agents live in `backend/ai/agents/`
- Default skills live in `backend/ai/skills/`
- Config services and runtime defaults now load these files first
- `agent_runtime.py` remains the execution layer for built-in implementations

## Agent Directory Convention

Each agent should use this structure:

- `manifest.yaml`
- `Soul.md`
- `prompts/system.md`
- `prompts/task.md`

## Skill Directory Convention

Each skill should use this structure:

- `manifest.yaml`
- `README.md`
- `executor.py` or `executor.js`
- `prompts/instructions.md`

## Current Migration Boundary

Already file-first:
- agent defaults for config service
- skill defaults for config service
- runtime default agent registry
- runtime default skill metadata

Still runtime-coded:
- built-in Python skill implementations in `backend/agent_runtime.py`
- background pipeline orchestration
- any future dynamic agent loading from file executors

## Next Suggested Changes

1. Move runtime implementations from `backend/agent_runtime.py` into per-skill executors.
2. Add validator scripts for agent and skill manifests.
3. Introduce versioned schemas for manifests in `packages/contracts/`.
4. Add a bootstrap command that syncs file defaults into MongoDB.
