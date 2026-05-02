from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from services.shared.python.settings import settings

AI_ROOT = Path(__file__).resolve().parent
AGENTS_ROOT = AI_ROOT / "agents"
SKILLS_ROOT = AI_ROOT / "skills"


def _read_text(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8").strip()


def _read_manifest(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _rel(path: Path) -> str:
    return path.relative_to(AI_ROOT.parent).as_posix()


def _llm_profile(profile: str | None) -> Dict[str, Any]:
    profiles: Dict[str, Dict[str, Any]] = {
        "mock-search": {"model": "mock-search"},
        "mock-preprocess": {"model": "mock-preprocess"},
        "mock-scheduler": {"model": "mock-scheduler"},
        "mock-notification": {"model": "mock-notification"},
        "content-generation": {
            "model": settings.ai_content_model,
            "remote_model": settings.ai_content_remote_model,
            "base_url": settings.ai_content_base_url,
            "api_key": settings.ai_content_api_key,
            "max_tokens": settings.ai_content_max_tokens,
            "temperature": settings.ai_content_temperature,
            "response_format_json": True,
        },
        "review": {
            "model": settings.ai_review_model,
            "remote_model": settings.ai_review_remote_model,
            "base_url": settings.ai_review_base_url,
            "api_key": settings.ai_review_api_key,
            "max_tokens": settings.ai_review_max_tokens,
            "temperature": settings.ai_review_temperature,
            "response_format_json": True,
        },
    }
    return dict(profiles.get(profile or "", {}))


def _load_agent_dir(agent_dir: Path) -> Dict[str, Any]:
    manifest_path = agent_dir / "manifest.yaml"
    manifest = _read_manifest(manifest_path)
    system_prompt = _read_text(agent_dir / "prompts" / "system.md")
    task_prompt = _read_text(agent_dir / "prompts" / "task.md")
    soul_markdown = _read_text(agent_dir / "Soul.md")

    metadata = dict(manifest.get("metadata") or {})
    metadata.setdefault("source", "file")
    metadata.setdefault("manifest_path", _rel(manifest_path))
    if soul_markdown:
        metadata.setdefault("soul_path", _rel(agent_dir / "Soul.md"))
    if system_prompt:
        metadata.setdefault("system_prompt_path", _rel(agent_dir / "prompts" / "system.md"))
    if task_prompt:
        metadata.setdefault("task_prompt_path", _rel(agent_dir / "prompts" / "task.md"))

    prompt_template = manifest.get("prompt_template") or "\n\n".join(
        chunk for chunk in [system_prompt, task_prompt] if chunk
    )

    llm_config = _llm_profile(manifest.get("llm_profile"))
    llm_config.update(manifest.get("llm_config") or {})

    return {
        "id": manifest["id"],
        "name": manifest["name"],
        "description": manifest.get("description", ""),
        "agent_type": manifest["agent_type"],
        "llm_config": llm_config,
        "prompt_template": prompt_template,
        "available_skills": list(manifest.get("available_skills", []) or []),
        "metadata": metadata,
    }


def _load_skill_dir(skill_dir: Path) -> Dict[str, Any]:
    manifest_path = skill_dir / "manifest.yaml"
    manifest = _read_manifest(manifest_path)
    readme_path = skill_dir / "README.md"
    instructions_path = skill_dir / "prompts" / "instructions.md"
    executor_py = skill_dir / "executor.py"
    executor_js = skill_dir / "executor.js"

    metadata = dict(manifest.get("metadata") or {})
    metadata.setdefault("source", "file")
    metadata.setdefault("manifest_path", _rel(manifest_path))
    if readme_path.exists():
        metadata.setdefault("readme_path", _rel(readme_path))
    if instructions_path.exists():
        metadata.setdefault("instructions_path", _rel(instructions_path))
    if executor_py.exists():
        metadata.setdefault("entrypoint", _rel(executor_py))
    elif executor_js.exists():
        metadata.setdefault("entrypoint", _rel(executor_js))

    return {
        "id": manifest["id"],
        "name": manifest["name"],
        "description": manifest.get("description", ""),
        "parameters": manifest.get("input_schema") or manifest.get("parameters") or {},
        "returns": manifest.get("output_schema") or manifest.get("returns") or {},
        "metadata": metadata,
    }


def load_file_agents() -> List[Dict[str, Any]]:
    if not AGENTS_ROOT.exists():
        return []
    documents: List[Dict[str, Any]] = []
    for agent_dir in sorted(path for path in AGENTS_ROOT.iterdir() if path.is_dir()):
        manifest_path = agent_dir / "manifest.yaml"
        if manifest_path.exists():
            documents.append(_load_agent_dir(agent_dir))
    return documents


def load_file_skills() -> List[Dict[str, Any]]:
    if not SKILLS_ROOT.exists():
        return []
    documents: List[Dict[str, Any]] = []
    for skill_dir in sorted(path for path in SKILLS_ROOT.iterdir() if path.is_dir()):
        manifest_path = skill_dir / "manifest.yaml"
        if manifest_path.exists():
            documents.append(_load_skill_dir(skill_dir))
    return documents
