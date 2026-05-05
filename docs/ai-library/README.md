# AI Library

`backend/ai/` 是文件化 Agent / Skill 资源库。配置服务会优先读取这些文件作为默认配置，运行时实现仍由 Python shared runtime 承载。

## Agent 目录约定

```text
backend/ai/agents/<agent_name>/
  manifest.yaml
  Soul.md
  prompts/system.md
  prompts/task.md
```

## Skill 目录约定

```text
backend/ai/skills/<skill_name>/
  manifest.yaml
  README.md
  executor.py 或 executor.js
  prompts/instructions.md
```

## 当前边界

已经文件化：

- Agent 默认配置。
- Skill 默认配置。
- Config Service 的默认读取。
- 运行时默认 Agent / Skill 元数据。

仍在代码中实现：

- 内置 Python skill 执行逻辑。
- 新闻后台流水线调度。
- 动态加载 executor 的完整沙箱策略。

## 后续维护

- 新增 Agent / Skill 时，先补齐 `manifest.yaml` 和 prompts。
- 涉及运行时执行能力时，同步更新 `backend/services/shared/python/agent_runtime.py`。
- 不在 prompt 或 manifest 中写入真实密钥。
