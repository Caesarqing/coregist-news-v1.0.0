from __future__ import annotations

from flask import Flask, jsonify, request

from ai.file_registry import load_file_skills
from services.shared.python.agent_runtime import build_default_skillset
from services.shared.python.queue import mongo_collection

app = Flask(__name__)


def serialize_skill_document(item):
    item["_id"] = str(item["_id"])
    return item


def load_default_skills():
    try:
        file_skills = load_file_skills()
        if file_skills:
            return file_skills
    except Exception as error:
        app.logger.warning("Failed to load file-based skills, falling back to runtime defaults: %s", error)
    return [skill.to_dict() for skill in build_default_skillset().list_skills()]


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "skill-config-service"})


@app.get("/skills/defaults")
def list_default_skills():
    return jsonify(load_default_skills())


@app.post("/skills/bootstrap")
def bootstrap_skills():
    defaults = load_default_skills()
    with mongo_collection("skill_configs") as collection:
        for item in defaults:
            collection.update_one({"id": item["id"]}, {"$set": item}, upsert=True)
    return jsonify({"message": "Default skills bootstrapped", "count": len(defaults)})


@app.post("/skills")
def create_skill():
    payload = request.get_json(force=True) or {}
    skill_id = payload.get("id")
    if not skill_id:
        return jsonify({"error": "id is required"}), 400
    with mongo_collection("skill_configs") as collection:
        collection.update_one({"id": skill_id}, {"$set": payload}, upsert=True)
    return jsonify({"message": "Skill created", "id": skill_id}), 201


@app.get("/skills")
def list_skills():
    with mongo_collection("skill_configs") as collection:
        items = [serialize_skill_document(item) for item in collection.find()]
    return jsonify(items)


@app.get("/skills/<skill_id>")
def get_skill(skill_id: str):
    with mongo_collection("skill_configs") as collection:
        item = collection.find_one({"id": skill_id})
    if not item:
        return jsonify({"error": "Skill not found"}), 404
    return jsonify(serialize_skill_document(item))


@app.put("/skills/<skill_id>")
def update_skill(skill_id: str):
    payload = request.get_json(force=True) or {}
    with mongo_collection("skill_configs") as collection:
        result = collection.update_one({"id": skill_id}, {"$set": payload})
    if result.matched_count == 0:
        return jsonify({"error": "Skill not found"}), 404
    return jsonify({"message": "Skill updated"})


@app.delete("/skills/<skill_id>")
def delete_skill(skill_id: str):
    with mongo_collection("skill_configs") as collection:
        result = collection.delete_one({"id": skill_id})
    if result.deleted_count == 0:
        return jsonify({"error": "Skill not found"}), 404
    return "", 204


if __name__ == "__main__":
    from services.shared.python.settings import settings

    app.run(host="0.0.0.0", port=settings.skill_config_port)
