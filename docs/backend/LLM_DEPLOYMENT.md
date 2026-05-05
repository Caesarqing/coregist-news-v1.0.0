# Self-hosted LLM deployment

The AI analysis pipeline is now split into two calls:

- `AI_CONTENT_*`: primary content model for title, summary, tags, and categories
- `AI_REVIEW_*`: high-quality review model for bias, scoring, and final review

## Recommended default

- Any OpenAI-compatible endpoint for the primary model, such as vLLM, SGLang, TGI, Ollama `/v1`, or a hosted compatible gateway.
- Anthropic-compatible endpoints can be selected with `LLM_PROVIDER=anthropic`.

## Run with Docker Compose

Start the application stack and the local OpenAI-compatible LLM service:

```bash
docker compose -f docker-compose.yml -f docker-compose.llm.yml up -d --build
```

## Important environment variables

```bash
HF_TOKEN=...
LLM_MODEL_NAME=meta-llama/Llama-3.3-70B-Instruct
LLM_TENSOR_PARALLEL_SIZE=4
LLM_GPU_COUNT=all
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=http://llama33-vllm:8000/v1
LLM_API_KEY=
LLM_MODEL=Llama-3.3-70B-Instruct
LLM_JSON_MODE=true
AI_CONTENT_MODEL=openai-compatible
AI_REVIEW_MODEL=openai-compatible
```

## Notes

- `docker-compose.llm.yml` assumes an NVIDIA GPU runtime.
- If you use another OpenAI-compatible server, keep `LLM_PROVIDER=openai-compatible` and change only `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL`.
- If you need a different model or endpoint for one stage, set `AI_CONTENT_LLM_MODEL` / `AI_CONTENT_BASE_URL` / `AI_CONTENT_API_KEY` or the matching `AI_REVIEW_*` variables.
