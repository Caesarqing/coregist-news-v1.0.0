from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class AgentType(str, Enum):
    SEARCH = "search"
    PREPROCESSING = "preprocessing"
    SUMMARIZATION = "summarization"
    BIAS_DETECTION = "bias_detection"
    EVALUATION = "evaluation"
    REVIEW = "review"
    SCHEDULER = "scheduler"
    NOTIFICATION = "notification"

    @classmethod
    def coerce(cls, value: "AgentType | str") -> "AgentType":
        if isinstance(value, cls):
            return value
        normalized = str(value).strip()
        if not normalized:
            raise ValueError("agent_type is required")
        normalized = normalized.replace("-", "_")
        try:
            return cls(normalized.lower())
        except ValueError:
            return cls[normalized.upper()]


@dataclass(slots=True)
class Agent:
    id: str
    name: str
    description: str
    agent_type: AgentType
    llm_config: Dict[str, Any] = field(default_factory=dict)
    prompt_template: str = ""
    available_skills: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["agent_type"] = self.agent_type.value
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Agent":
        agent_type = AgentType.coerce(data.get("agent_type", AgentType.REVIEW))
        return cls(
            id=data["id"],
            name=data["name"],
            description=data.get("description", ""),
            agent_type=agent_type,
            llm_config=data.get("llm_config", {}) or {},
            prompt_template=data.get("prompt_template", "") or "",
            available_skills=list(data.get("available_skills", []) or []),
            metadata=data.get("metadata", {}) or {},
        )


class AgentRegistry:
    def __init__(self) -> None:
        self._agents: Dict[str, Agent] = {}

    def register_agent(self, agent_instance: Agent, *, replace: bool = False) -> Agent:
        if agent_instance.id in self._agents and not replace:
            raise ValueError(f"Agent with ID '{agent_instance.id}' already registered.")
        self._agents[agent_instance.id] = agent_instance
        return agent_instance

    def get_agent(self, agent_id: str) -> Agent:
        agent = self._agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent with ID '{agent_id}' not found.")
        return agent

    def find_agent(self, agent_id: str) -> Optional[Agent]:
        return self._agents.get(agent_id)

    def list_agents(self) -> List[Agent]:
        return list(self._agents.values())

    def list_agents_by_type(self, agent_type: AgentType) -> List[Agent]:
        return [agent for agent in self._agents.values() if agent.agent_type == agent_type]

    def remove_agent(self, agent_id: str) -> bool:
        return self._agents.pop(agent_id, None) is not None

    def export(self) -> List[Dict[str, Any]]:
        return [agent.to_dict() for agent in self.list_agents()]
