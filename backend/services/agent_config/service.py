from __future__ import annotations

from flask import Flask, jsonify, request

from ai.file_registry import load_file_agents
from services.shared.python.agent_registry import Agent, AgentType
from services.shared.python.agent_runtime import build_default_agent_registry
from services.shared.python.queue import mongo_collection

app = Flask(__name__)


def serialize_agent_document(item):
    item["_id"] = str(item["_id"])
    return item


def load_default_agents():
    try:
        file_agents = load_file_agents()
        if file_agents:
            return file_agents
    except Exception as error:
        app.logger.warning("Failed to load file-based agents, falling back to runtime defaults: %s", error)
    return [agent.to_dict() for agent in build_default_agent_registry().list_agents()]


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "agent-config-service"})


@app.get("/agents/defaults")
def list_default_agents():
    return jsonify(load_default_agents())


@app.post("/agents/bootstrap")
def bootstrap_agents():
    defaults = load_default_agents()
    with mongo_collection("agent_configs") as collection:
        for item in defaults:
            collection.update_one({"id": item["id"]}, {"$set": item}, upsert=True)
    return jsonify({"message": "Default agents bootstrapped", "count": len(defaults)})


@app.post("/agents")
def create_agent():
    payload = request.get_json(force=True) or {}
    try:
        payload["agent_type"] = AgentType.coerce(payload.get("agent_type", AgentType.REVIEW)).value
        agent = Agent.from_dict(payload)
    except (KeyError, ValueError) as error:
        return jsonify({"error": str(error)}), 400
    with mongo_collection("agent_configs") as collection:
        collection.update_one({"id": agent.id}, {"$set": agent.to_dict()}, upsert=True)
    return jsonify({"message": "Agent created", "id": agent.id}), 201


@app.get("/agents")
def list_agents():
    with mongo_collection("agent_configs") as collection:
        items = [serialize_agent_document(item) for item in collection.find()]
    return jsonify(items)


@app.get("/agents/<agent_id>")
def get_agent(agent_id: str):
    with mongo_collection("agent_configs") as collection:
        item = collection.find_one({"id": agent_id})
    if not item:
        return jsonify({"error": "Agent not found"}), 404
    return jsonify(serialize_agent_document(item))


@app.put("/agents/<agent_id>")
def update_agent(agent_id: str):
    payload = request.get_json(force=True) or {}
    if "agent_type" in payload:
        try:
            payload["agent_type"] = AgentType.coerce(payload["agent_type"]).value
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
    with mongo_collection("agent_configs") as collection:
        result = collection.update_one({"id": agent_id}, {"$set": payload})
    if result.matched_count == 0:
        return jsonify({"error": "Agent not found"}), 404
    return jsonify({"message": "Agent updated"})


@app.delete("/agents/<agent_id>")
def delete_agent(agent_id: str):
    with mongo_collection("agent_configs") as collection:
        result = collection.delete_one({"id": agent_id})
    if result.deleted_count == 0:
        return jsonify({"error": "Agent not found"}), 404
    return "", 204


if __name__ == "__main__":
    from services.shared.python.settings import settings

    app.run(host="0.0.0.0", port=settings.agent_config_port)
