# LLM 配置

## 当前接口

Python worker 统一通过 `backend/services/shared/python/llm.py` 调用模型。旧的供应商专用变量已经删除，统一使用通用变量。

支持的 provider：

- `openai-compatible`: `/chat/completions` 兼容接口。
- `anthropic`: Anthropic `/v1/messages`。
- `mock`: 本地调试占位。

## OpenAI-compatible

适用于 OpenAI、兼容网关、MiniMax、GLM、Google 兼容网关、自托管 vLLM / SGLang / TGI、Ollama `/v1` 等。

```env
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://your-provider.example/v1
LLM_API_KEY=your-key
LLM_MODEL=your-model
LLM_JSON_MODE=false

AI_CONTENT_MODEL=openai-compatible
AI_REVIEW_MODEL=openai-compatible
AI_CONTENT_JSON_MODE=false
AI_REVIEW_JSON_MODE=false
```

如果某个 provider 支持稳定 JSON mode，可以把 `LLM_JSON_MODE`、`AI_CONTENT_JSON_MODE`、`AI_REVIEW_JSON_MODE` 改为 `true`。

可选通用参数：

```env
LLM_TOKEN_FIELD=max_tokens
LLM_TOP_P=
LLM_FREQUENCY_PENALTY=
LLM_PRESENCE_PENALTY=
LLM_SYSTEM_PROMPT=
LLM_EXTRA_BODY_JSON=
```

`LLM_TOKEN_FIELD` 默认使用 `max_tokens`。如果兼容接口要求 OpenAI 新式字段，可以改为 `max_completion_tokens`。

`LLM_EXTRA_BODY_JSON` 会作为 JSON 对象合并到 `/chat/completions` payload 顶层，用于兼容 provider 特有参数。

## MiMo

MiMo 使用 OpenAI-compatible 方式接入：

```env
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://api.xiaomimimo.com/v1
LLM_API_KEY=your-mimo-api-key
LLM_MODEL=mimo-v2.5-pro
LLM_JSON_MODE=false
LLM_TOKEN_FIELD=max_completion_tokens
LLM_TOP_P=0.95
LLM_EXTRA_BODY_JSON={"thinking":{"type":"disabled"}}

AI_CONTENT_MODEL=openai-compatible
AI_REVIEW_MODEL=openai-compatible
AI_CONTENT_JSON_MODE=false
AI_REVIEW_JSON_MODE=false
```

如果要测试其他 MiMo 模型，只需要替换 `LLM_MODEL`。新闻处理依赖文本分类和 JSON 解析，优先使用 chat/text 模型。

## Ollama

```env
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=http://127.0.0.1:11434/v1
LLM_API_KEY=
LLM_MODEL=llama3.1
LLM_JSON_MODE=false
```

## Anthropic

```env
LLM_PROVIDER=anthropic
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_API_KEY=your-key
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
ANTHROPIC_VERSION=2023-06-01
```

## 单独覆盖内容模型和复核模型

默认情况下 `AI_CONTENT_*` 和 `AI_REVIEW_*` 跟随 `LLM_*`。如需分开配置：

```env
AI_CONTENT_MODEL=openai-compatible
AI_CONTENT_LLM_MODEL=fast-content-model
AI_CONTENT_BASE_URL=https://content-provider.example/v1
AI_CONTENT_API_KEY=content-key

AI_REVIEW_MODEL=openai-compatible
AI_REVIEW_LLM_MODEL=strong-review-model
AI_REVIEW_BASE_URL=https://review-provider.example/v1
AI_REVIEW_API_KEY=review-key
```

## 旧配置清理

供应商专用旧变量已经不再读取。`.env` 中只保留本页说明的通用 `LLM_*`、`AI_CONTENT_*`、`AI_REVIEW_*` 和可选 `ANTHROPIC_*` 变量即可。

如果仍使用某个兼容网关，把它的 key 放到 `LLM_API_KEY`，模型名放到 `LLM_MODEL`。

## 快速验证

```bash
cd /root/coregist-news/backend

python3 - <<'PY'
from services.shared.python.settings import settings
print("provider:", settings.llm_provider)
print("base_url:", settings.llm_base_url)
print("model:", settings.llm_model)
print("content model:", settings.ai_content_model)
print("review model:", settings.ai_review_model)
print("json mode:", settings.llm_json_mode)
PY
```

如果日志中连续出现 `LLM invoke failed`，先直接用相同 base URL、key 和 model 调一个最小 chat completion，确认供应商没有限额、满载或模型下线。
