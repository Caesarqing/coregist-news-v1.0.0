# AI Library

This directory is the file-first source of truth for default agents and skills.

## Agents
- `agents/<agent_id>/manifest.yaml`
- `agents/<agent_id>/Soul.md`
- `agents/<agent_id>/prompts/system.md`
- `agents/<agent_id>/prompts/task.md`

## Skills
- `skills/<skill_id>/manifest.yaml`
- `skills/<skill_id>/README.md`
- `skills/<skill_id>/executor.py`
- `skills/<skill_id>/prompts/instructions.md`

The config services load these files first and only fall back to hardcoded runtime defaults when the file library is missing or invalid.
