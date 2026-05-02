from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional


Implementation = Callable[..., Any]


@dataclass(slots=True)
class Skill:
    id: str
    name: str
    description: str
    parameters: Dict[str, Any]
    returns: Dict[str, Any]
    implementation: Implementation
    metadata: Dict[str, Any] = field(default_factory=dict)

    def execute(self, **kwargs: Any) -> Any:
        self._validate_required_parameters(kwargs)
        return self.implementation(**kwargs)

    def _validate_required_parameters(self, kwargs: Dict[str, Any]) -> None:
        missing = [
            name
            for name, schema in self.parameters.items()
            if isinstance(schema, dict) and schema.get("required", True) and name not in kwargs
        ]
        if missing:
            raise ValueError(f"Skill '{self.id}' missing required parameters: {', '.join(missing)}")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
            "returns": self.returns,
            "metadata": self.metadata,
        }


class Skillset:
    def __init__(self) -> None:
        self._skills: Dict[str, Skill] = {}

    def register_skill(self, skill_instance: Skill, *, replace: bool = False) -> Skill:
        if skill_instance.id in self._skills and not replace:
            raise ValueError(f"Skill with ID '{skill_instance.id}' already registered.")
        self._skills[skill_instance.id] = skill_instance
        return skill_instance

    def get_skill(self, skill_id: str) -> Skill:
        skill = self._skills.get(skill_id)
        if not skill:
            raise ValueError(f"Skill with ID '{skill_id}' not found.")
        return skill

    def find_skill(self, skill_id: str) -> Optional[Skill]:
        return self._skills.get(skill_id)

    def list_skills(self) -> List[Skill]:
        return list(self._skills.values())

    def remove_skill(self, skill_id: str) -> bool:
        return self._skills.pop(skill_id, None) is not None

    def export(self) -> List[Dict[str, Any]]:
        return [skill.to_dict() for skill in self.list_skills()]
