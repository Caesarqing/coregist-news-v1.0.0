# Shared Python Runtime

`backend/services/shared/python/` 存放 Python worker 共用运行时代码。

## 当前模块

- `settings.py`: `.env` 读取和服务配置。
- `queue.py`: RabbitMQ 队列封装和队列名常量。
- `llm.py`: OpenAI-compatible / Anthropic / mock 通用 LLM provider。
- `agent_runtime.py`: 内置 Agent / Skill 运行时。
- `repositories/`: MongoDB repository 封装。
- 新闻、RSS、内容处理相关共享工具。

## 使用约定

- Python worker 优先从这里导入共享能力。
- `.env` 加载使用 `override=True`，生产 PM2 重启时以当前 `backend/.env` 为准。
- LLM 配置只使用通用变量，详见 `docs/LLM.md`。
- 不在共享模块里硬编码真实密钥、模型 key 或生产 URL。
