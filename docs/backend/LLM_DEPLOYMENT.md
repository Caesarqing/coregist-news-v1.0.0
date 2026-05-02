# Self-hosted LLM deployment

The AI analysis pipeline is now split into two calls:

- `AI_CONTENT_*`: primary content model for title, summary, tags, and categories
- `AI_REVIEW_*`: high-quality review model for bias, scoring, and final review

## Recommended default

- Self-hosted primary model: `Llama-3.3-70B-Instruct`
- Review model: `Gemini 2.5 Flash` or `gpt-4o-mini`

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
AI_CONTENT_MODEL=openai_compatible
AI_CONTENT_REMOTE_MODEL=Llama-3.3-70B-Instruct
AI_CONTENT_BASE_URL=http://llama33-vllm:8000/v1
AI_REVIEW_MODEL=gemini-2.5-flash
GEMINI_API_KEY=...
```

## Notes

- `docker-compose.llm.yml` assumes an NVIDIA GPU runtime.
- If you use another OpenAI-compatible server such as `SGLang` or `TGI`, keep `AI_CONTENT_MODEL=openai_compatible` and only change `AI_CONTENT_BASE_URL` and `AI_CONTENT_REMOTE_MODEL`.
- If you want both stages self-hosted, point `AI_REVIEW_MODEL=openai_compatible` and set `AI_REVIEW_BASE_URL` and `AI_REVIEW_REMOTE_MODEL`.
