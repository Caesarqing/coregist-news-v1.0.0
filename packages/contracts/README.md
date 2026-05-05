# @coregist/contracts

共享 API 契约包，用于沉淀前后端共同依赖的 DTO、路径常量和类型定义。

## 范围

- Auth DTO。
- User / Profile / Settings DTO。
- News DTO。
- Tracking DTO。
- AI Search DTO。
- Agent / Skill Config DTO。
- API path constants。

## 使用者

- `frontend/` Web 客户端。
- `backend/gateway/` 和各业务服务。
- 后续移动端或外部客户端。

当前前端仍存在部分本地类型，新增或修改 API 时应逐步迁移到本包。
