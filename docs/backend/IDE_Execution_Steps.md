# IDE 自动化改造执行步骤

本文件旨在为 IDE 工具（如 CodeX, Cursor, Claude Dev）提供详细的、可执行的步骤指令，以辅助完成 AI Agent 新闻项目后端的改造工作。请严格按照以下步骤和要求进行代码生成和文件修改。

## 0. 前提条件与环境准备

1.  **理解项目目标**：确保已阅读并理解《AI Agent 后端改造全局指导手册 (Global_Refactor_Guide.md)》，明确改造的整体目标、架构和核心理念。
2.  **现有项目结构**：熟悉 `coregist-news` 项目的现有文件结构和技术栈（Node.js/Express, MongoDB, Python LLM 脚本）。
3.  **Docker 环境**：确保开发环境中已安装 Docker 和 Docker Compose。
4.  **Python 环境**：确保 Python 3.9+ 环境可用，并准备安装必要的库。

## 1. 阶段一：基础架构增强与数据迁移

### 1.1 Docker 环境配置

**目标**：使用 Docker Compose 搭建 MongoDB 和 Redis 服务。

**指令**：

请在项目根目录下创建 `docker-compose.yml` 文件，并添加 MongoDB 和 Redis 服务的配置。MongoDB 端口映射到 27017，Redis 端口映射到 6379。为 MongoDB 配置持久化存储卷。

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: mongodb
    ports:
      - 
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: example

  redis:
    image: redis:latest
    container_name: redis
    ports:
      - "6379:6379"

volumes:
  mongodb_data:
```

**操作**：
1.  将上述内容保存为 `docker-compose.yml` 文件。
2.  在终端执行 `docker-compose up -d` 启动服务。

### 1.2 消息队列集成 (RabbitMQ)

**目标**：引入 RabbitMQ 作为消息队列，实现服务间的解耦。

**指令**：

请在 `docker-compose.yml` 中添加 RabbitMQ 服务配置，端口映射到 5672 (AMQP) 和 15672 (管理界面)。

```yaml
# docker-compose.yml (追加)

  rabbitmq:
    image: rabbitmq:3-management
    container_name: rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
```

**操作**：
1.  将上述内容追加到 `docker-compose.yml` 文件。
2.  在终端执行 `docker-compose up -d` 更新服务。

### 1.3 基础服务重构 (Node.js)

**目标**：将现有 Node.js 后端服务拆分为 API 网关和用户服务，并准备与 Python Agent 服务通信的接口。

**指令**：

1.  **API 网关 (Gateway Service)**：
    *   创建一个新的 Node.js 项目，作为 API 网关。负责接收所有前端请求，并根据路由转发到相应的微服务。
    *   实现用户认证和授权逻辑。
    *   定义 `/api/news`、`/api/users` 等路由，并准备转发逻辑。

2.  **用户服务 (User Service)**：
    *   将现有 `coregist-news` 中与用户管理相关的代码（用户模型、认证逻辑）迁移到独立的 Node.js 用户服务。
    *   该服务直接与 MongoDB 交互。

**文件修改示例**：

*   **`gateway/app.js` (示例)**：
    ```javascript
    const express = require('express');
    const app = express();
    const axios = require('axios');
    const jwt = require('jsonwebtoken');

    app.use(express.json());

    // 认证中间件 (简化示例)
    const authenticateToken = (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token == null) return res.sendStatus(401);

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    };

    // 用户服务路由转发
    app.use('/api/users', authenticateToken, (req, res) => {
        // 假设用户服务运行在 http://user-service:3001
        axios({ method: req.method, url: `http://user-service:3001${req.url}`, headers: req.headers, data: req.body })
            .then(response => res.json(response.data))
            .catch(error => res.status(error.response?.status || 500).send(error.message));
    });

    // 新闻服务路由转发 (待实现)
    app.use('/api/news', authenticateToken, (req, res) => {
        // 假设新闻服务运行在 http://news-service:3002
        axios({ method: req.method, url: `http://news-service:3002${req.url}`, headers: req.headers, data: req.body })
            .then(response => res.json(response.data))
            .catch(error => res.status(error.response?.status || 500).send(error.message));
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Gateway Service running on port ${PORT}`));
    ```

*   **`user-service/app.js` (示例)**：
    ```javascript
    const express = require('express');
    const mongoose = require('mongoose');
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const app = express();

    app.use(express.json());

    mongoose.connect('mongodb://mongodb:27017/coregist-news', { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log('Connected to MongoDB'))
        .catch(err => console.error('Could not connect to MongoDB', err));

    // 定义 User Schema 和 Model (从 coregist-news 迁移)
    const userSchema = new mongoose.Schema({
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        email: { type: String, required: true, unique: true }
    });
    const User = mongoose.model('User', userSchema);

    // 注册用户
    app.post('/register', async (req, res) => {
        try {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            const user = new User({
                username: req.body.username,
                email: req.body.email,
                password: hashedPassword
            });
            await user.save();
            res.status(201).send('User registered');
        } catch (error) {
            res.status(500).send(error.message);
        }
    });

    // 登录用户
    app.post('/login', async (req, res) => {
        const user = await User.findOne({ username: req.body.username });
        if (user == null) return res.status(400).send('Cannot find user');

        try {
            if (await bcrypt.compare(req.body.password, user.password)) {
                const accessToken = jwt.sign({ username: user.username }, process.env.ACCESS_TOKEN_SECRET);
                res.json({ accessToken: accessToken });
            } else {
                res.status(401).send('Not Allowed');
            }
        } catch (error) {
            res.status(500).send(error.message);
        }
    });

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));
    ```

**操作**：
1.  根据上述示例，创建 `gateway` 和 `user-service` 两个目录，并分别创建 `app.js` 文件。
2.  安装必要的 npm 包：`npm install express axios jsonwebtoken bcrypt mongoose`。
3.  更新 `docker-compose.yml`，添加 `gateway` 和 `user-service` 服务。

```yaml
# docker-compose.yml (追加)

  gateway:
    build:
      context: ./gateway
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      ACCESS_TOKEN_SECRET: your_secret_key_here # 请替换为强密钥
    depends_on:
      - user-service
      # - news-service # 待实现

  user-service:
    build:
      context: ./user-service
      dockerfile: Dockerfile
    environment:
      ACCESS_TOKEN_SECRET: your_secret_key_here # 请替换为强密钥
    depends_on:
      - mongodb
```

*   **`gateway/Dockerfile`**：
    ```dockerfile
    FROM node:18-alpine
    WORKDIR /app
    COPY package*.json ./
    RUN npm install
    COPY . .
    EXPOSE 3000
    CMD ["node", "app.js"]
    ```

*   **`user-service/Dockerfile`**：
    ```dockerfile
    FROM node:18-alpine
    WORKDIR /app
    COPY package*.json ./
    RUN npm install
    COPY . .
    EXPOSE 3001
    CMD ["node", "app.js"]
    ```

**操作**：
1.  在 `gateway` 和 `user-service` 目录下分别创建 `Dockerfile`。
2.  在 `gateway` 和 `user-service` 目录下分别创建 `package.json` 文件，并添加依赖。
3.  执行 `docker-compose up -d --build` 启动所有服务。

## 2. 阶段二：Agent 库与 Skills 库实现

**目标**：实现 `AgentRegistry` 和 `Skillset`，为多 Agent 协作奠定基础。

**指令**：

1.  **`agent_registry.py` 实现**：
    *   在项目根目录下创建 `agent_registry.py` 文件。
    *   根据《AI Agent 后端改造全局指导手册》中“3.2 Agent 库设计 (Agent Registry)”章节的定义，实现 `Agent` 类、`AgentType` 枚举和 `AgentRegistry` 类。
    *   确保 `Agent` 类包含 `id`, `name`, `description`, `agent_type`, `llm_config`, `prompt_template`, `available_skills` 等属性。
    *   `AgentType` 枚举应包含 `SEARCH`, `SUMMARIZATION`, `BIAS_DETECTION`, `EVALUATION`, `REVIEW`, `SCHEDULER`, `NOTIFICATION`。
    *   `AgentRegistry` 应提供 `register_agent`, `get_agent`, `list_agents` 方法。

2.  **`skillset.py` 实现**：
    *   在项目根目录下创建 `skillset.py` 文件。
    *   根据《AI Agent 后端改造全局指导手册》中“3.3 Skills 库设计 (Skillset)”章节的定义，实现 `Skill` 类和 `Skillset` 类。
    *   确保 `Skill` 类包含 `id`, `name`, `description`, `parameters`, `returns`, `implementation` 等属性。
    *   `Skillset` 应提供 `register_skill`, `get_skill`, `list_skills` 方法。

3.  **LLM 抽象层**：
    *   创建一个 `llm_provider.py` 文件，抽象 LLM 调用接口。
    *   实现一个 `LLMProvider` 类，提供 `invoke(model_name, prompt, **kwargs)` 方法。
    *   该方法应能根据 `model_name` 动态调用 OpenAI、Google Generative AI 或 Ollama 等不同模型的 API。

**文件修改示例**：

*   **`agent_registry.py`**：
    ```python
    from enum import Enum
    from typing import List, Dict, Any, Callable

    class AgentType(Enum):
        SEARCH = "SEARCH"
        SUMMARIZATION = "SUMMARIZATION"
        BIAS_DETECTION = "BIAS_DETECTION"
        EVALUATION = "EVALUATION"
        REVIEW = "REVIEW"
        SCHEDULER = "SCHEDULER"
        NOTIFICATION = "NOTIFICATION"

    class Agent:
        def __init__(
            self,
            id: str,
            name: str,
            description: str,
            agent_type: AgentType,
            llm_config: Dict[str, Any],
            prompt_template: str,
            available_skills: List[str] = None
        ):
            self.id = id
            self.name = name
            self.description = description
            self.agent_type = agent_type
            self.llm_config = llm_config
            self.prompt_template = prompt_template
            self.available_skills = available_skills if available_skills is not None else []

        def __repr__(self):
            return f"<Agent(id=\"{self.id}\", name=\"{self.name}\")>"

    class AgentRegistry:
        def __init__(self):
            self._agents: Dict[str, Agent] = {}

        def register_agent(self, agent_instance: Agent):
            if agent_instance.id in self._agents:
                raise ValueError(f"Agent with ID {agent_instance.id} already registered.")
            self._agents[agent_instance.id] = agent_instance

        def get_agent(self, agent_id: str) -> Agent:
            agent = self._agents.get(agent_id)
            if not agent:
                raise ValueError(f"Agent with ID {agent_id} not found.")
            return agent

        def list_agents(self) -> List[Agent]:
            return list(self._agents.values())

    # 示例注册
    # agent_registry = AgentRegistry()
    # search_agent = Agent(
    #     id="search_agent",
    #     name="新闻搜索代理",
    #     description="负责从多个新闻源和搜索引擎获取相关新闻链接和内容。",
    #     agent_type=AgentType.SEARCH,
    #     llm_config={"model": "gpt-3.5-turbo", "api_key": "YOUR_OPENAI_API_KEY"},
    #     prompt_template="你是一个新闻搜索专家，请根据以下关键词搜索新闻：{query}",
    #     available_skills=["web_search", "content_scraper"]
    # )
    # agent_registry.register_agent(search_agent)
    ```

*   **`skillset.py`**：
    ```python
    from typing import Callable, List, Dict, Any

    class Skill:
        def __init__(
            self,
            id: str,
            name: str,
            description: str,
            parameters: Dict[str, Any],
            returns: Dict[str, Any],
            implementation: Callable
        ):
            self.id = id
            self.name = name
            self.description = description
            self.parameters = parameters
            self.returns = returns
            self.implementation = implementation

        def execute(self, **kwargs) -> Any:
            # 在这里可以添加参数校验、日志记录等逻辑
            return self.implementation(**kwargs)

        def __repr__(self):
            return f"<Skill(id=\"{self.id}\", name=\"{self.name}\")>"

    class Skillset:
        def __init__(self):
            self._skills: Dict[str, Skill] = {}

        def register_skill(self, skill_instance: Skill):
            if skill_instance.id in self._skills:
                raise ValueError(f"Skill with ID {skill_instance.id} already registered.")
            self._skills[skill_instance.id] = skill_instance

        def get_skill(self, skill_id: str) -> Skill:
            skill = self._skills.get(skill_id)
            if not skill:
                raise ValueError(f"Skill with ID {skill_id} not found.")
            return skill

        def list_skills(self) -> List[Skill]:
            return list(self._skills.values())

    # 示例 Skill 实现 (Web Search)
    # def _execute_web_search(query: str) -> List[Dict[str, str]]:
    #     print(f"Executing web search for: {query}")
    #     # 实际调用搜索引擎 API 的逻辑
    #     return [{"title": "Example News", "url": "http://example.com/news"}]

    # # 示例注册
    # skillset = Skillset()
    # web_search_skill = Skill(
    #     id="web_search",
    #     name="网页搜索",
    #     description="通过搜索引擎执行关键词搜索，返回相关链接和摘要。",
    #     parameters={"query": {"type": "str", "description": "搜索关键词"}},
    #     returns={"results": {"type": "List[dict]", "description": "搜索结果列表"}},
    #     implementation=_execute_web_search
    # )
    # skillset.register_skill(web_search_skill)
    ```

*   **`llm_provider.py`**：
    ```python
    import os
    from typing import Dict, Any
    # from openai import OpenAI # 假设已安装 openai 库
    # from google.generativeai import GenerativeModel # 假设已安装 google-generativeai 库

    class LLMProvider:
        def __init__(self):
            # 初始化不同 LLM 客户端
            # self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            # self.gemini_model = GenerativeModel(model_name="gemini-pro", api_key=os.getenv("GEMINI_API_KEY"))
            pass

        def invoke(self, model_name: str, prompt: str, **kwargs) -> str:
            if model_name.startswith("gpt"):
                # 模拟 OpenAI 调用
                # response = self.openai_client.chat.completions.create(
                #     model=model_name,
                #     messages=[{"role": "user", "content": prompt}],
                #     **kwargs
                # )
                # return response.choices[0].message.content
                return f"[Mock Response from {model_name}]: {prompt}"
            elif model_name.startswith("gemini"):
                # 模拟 Gemini 调用
                # response = self.gemini_model.generate_content(prompt, **kwargs)
                # return response.text
                return f"[Mock Response from {model_name}]: {prompt}"
            elif model_name.startswith("ollama"):
                # 模拟 Ollama 调用 (需要自行实现 Ollama 客户端)
                return f"[Mock Response from {model_name}]: {prompt}"
            else:
                raise ValueError(f"Unsupported LLM model: {model_name}")

    # 示例
    # llm_provider = LLMProvider()
    # response = llm_provider.invoke("gpt-3.5-turbo", "Hello, how are you?")
    # print(response)
    ```

**操作**：
1.  在项目根目录下创建 `agent_registry.py`、`skillset.py` 和 `llm_provider.py` 文件，并填入上述代码。
2.  根据需要安装 Python 依赖：`pip install openai google-generativeai` (如果使用实际 API)。

## 3. 阶段三：核心 Agent 功能开发

**目标**：实现新闻抓取、内容处理、摘要、褒贬性判断、评价性判断和审核 Agent 的核心逻辑。

**指令**：

1.  **新闻抓取 Agent (SearchAgent)**：
    *   创建一个 `news_scraper_service.py` 文件。
    *   实现一个 `NewsScraperService` 类，其中包含 `crawl_news(query: str)` 方法。
    *   该方法应利用 `AgentRegistry` 获取 `SearchAgent` 实例，并调用 `Skillset` 中的 `web_search` 和 `content_scraper` Skills 来获取新闻链接和内容。
    *   将抓取到的新闻数据（包含原始 URL、标题、内容等）发布到 RabbitMQ 消息队列（例如 `news_raw_queue`）。

2.  **内容处理 Agent (PreprocessingAgent)**：
    *   创建一个 `content_processing_service.py` 文件。
    *   实现一个 `ContentProcessingService` 类，监听 `news_raw_queue`。
    *   接收原始新闻，利用 `AgentRegistry` 获取 `PreprocessingAgent` 实例，并调用 `TextCleanerSkill`、`LanguageDetectorSkill` 等 Skills 进行预处理。
    *   将处理后的新闻数据（标准化文本、语言信息等）发布到 RabbitMQ 消息队列（例如 `news_processed_queue`）。

3.  **摘要 Agent (SummarizationAgent)**：
    *   创建一个 `ai_analysis_service.py` 文件，该文件将包含多个 AI Agent 的逻辑。
    *   在该文件中实现 `SummarizationAgent` 的逻辑，监听 `news_processed_queue`。
    *   接收处理后的新闻，利用 `AgentRegistry` 获取 `SummarizationAgent` 实例，并调用 `LLMProvider` 生成中英文摘要。
    *   将摘要结果与新闻 ID 一起发布到 RabbitMQ 消息队列（例如 `news_summarized_queue`）。

4.  **褒贬性判断 Agent (BiasDetectionAgent)**：
    *   在 `ai_analysis_service.py` 中实现 `BiasDetectionAgent` 的逻辑，监听 `news_processed_queue`。
    *   接收处理后的新闻，利用 `AgentRegistry` 获取 `BiasDetectionAgent` 实例，并调用 `LLMProvider` 进行褒贬性判断、事实陈述准确性分析。
    *   集成 `Skillset` 中的 `FactCheckerSkill`、`SentimentAnalyzerSkill` 辅助判断。
    *   将分析结果与新闻 ID 一起发布到 RabbitMQ 消息队列（例如 `news_bias_detected_queue`）。

5.  **评价性判断 Agent (EvaluationAgent)**：
    *   在 `ai_analysis_service.py` 中实现 `EvaluationAgent` 的逻辑，监听 `news_processed_queue`。
    *   接收处理后的新闻，利用 `AgentRegistry` 获取 `EvaluationAgent` 实例，并调用 `LLMProvider` 进行多维度评价打分。
    *   集成 `Skillset` 中的 `KnowledgeGraphQuerySkill`、`SocialMediaMonitorSkill` 辅助评估。
    *   将评价结果与新闻 ID 一起发布到 RabbitMQ 消息队列（例如 `news_evaluated_queue`）。

6.  **审核 Agent (ReviewAgent)**：
    *   在 `ai_analysis_service.py` 中实现 `ReviewAgent` 的逻辑，监听 `news_summarized_queue`, `news_bias_detected_queue`, `news_evaluated_queue`。
    *   接收所有 Agent 的分析结果，利用 `AgentRegistry` 获取 `ReviewAgent` 实例，进行最终审核和修正。
    *   将最终结果（包含所有分析数据）发布到 RabbitMQ 消息队列（例如 `news_final_queue`），并最终持久化到 MongoDB。

**文件修改示例**：

*   **`news_scraper_service.py` (示例)**：
    ```python
    import pika
    import json
    from agent_registry import AgentRegistry, AgentType
    from skillset import Skillset, Skill
    # 假设 web_search_implementation 和 content_scraper_implementation 已定义

    class NewsScraperService:
        def __init__(self, agent_registry: AgentRegistry, skillset: Skillset):
            self.agent_registry = agent_registry
            self.skillset = skillset
            self.search_agent = self.agent_registry.get_agent("search_agent")
            self.connection = pika.BlockingConnection(pika.ConnectionParameters("rabbitmq"))
            self.channel = self.connection.channel()
            self.channel.queue_declare(queue="news_raw_queue")

        def _web_search_implementation(self, query: str) -> List[Dict[str, str]]:
            print(f"[Skill] Executing web search for: {query}")
            # 实际调用搜索引擎 API 的逻辑，这里使用 mock 数据
            return [
                {"title": f"Mock News 1 about {query}", "url": "http://example.com/news1"},
                {"title": f"Mock News 2 about {query}", "url": "http://example.com/news2"}
            ]

        def _content_scraper_implementation(self, url: str) -> str:
            print(f"[Skill] Scraping content from: {url}")
            # 实际网页抓取逻辑，这里使用 mock 数据
            return f"This is the mock content of the news from {url}. It talks about {self.search_agent.prompt_template.format(query='some_query')}."

        def register_skills(self):
            self.skillset.register_skill(Skill(
                id="web_search",
                name="网页搜索",
                description="通过搜索引擎执行关键词搜索，返回相关链接和摘要。",
                parameters={"query": {"type": "str", "description": "搜索关键词"}},
                returns={"results": {"type": "List[dict]", "description": "搜索结果列表"}},
                implementation=self._web_search_implementation
            ))
            self.skillset.register_skill(Skill(
                id="content_scraper",
                name="内容抓取",
                description="根据 URL 抓取网页内容，并提取正文。",
                parameters={"url": {"type": "str", "description": "待抓取网页的URL"}},
                returns={"content": {"type": "str", "description": "网页正文内容"}},
                implementation=self._content_scraper_implementation
            ))

        def crawl_news(self, query: str):
            print(f"[NewsScraperService] Starting crawl for query: {query}")
            # Agent 决策：调用 web_search skill
            search_results = self.skillset.get_skill("web_search").execute(query=query)

            for result in search_results:
                url = result["url"]
                title = result["title"]
                # Agent 决策：调用 content_scraper skill
                content = self.skillset.get_skill("content_scraper").execute(url=url)

                news_data = {
                    "url": url,
                    "title": title,
                    "raw_content": content,
                    "query": query
                }
                self.channel.basic_publish(
                    exchange="",
                    routing_key="news_raw_queue",
                    body=json.dumps(news_data)
                )
                print(f"[NewsScraperService] Published raw news for {url} to news_raw_queue.")

    # 启动服务示例
    # if __name__ == "__main__":
    #     # 假设 AgentRegistry 和 Skillset 已初始化并注册了必要的 Agent 和 Skill
    #     agent_registry = AgentRegistry()
    #     agent_registry.register_agent(Agent(
    #         id="search_agent",
    #         name="新闻搜索代理",
    #         description="负责从多个新闻源和搜索引擎获取相关新闻链接和内容。",
    #         agent_type=AgentType.SEARCH,
    #         llm_config={"model": "mock-llm", "api_key": ""},
    #         prompt_template="你是一个新闻搜索专家，请根据以下关键词搜索新闻：{query}",
    #         available_skills=["web_search", "content_scraper"]
    #     ))
    #     skillset = Skillset()
    #     scraper_service = NewsScraperService(agent_registry, skillset)
    #     scraper_service.register_skills()
    #     scraper_service.crawl_news("AI Agent 最新进展")
    ```

*   **`content_processing_service.py` (示例)**：
    ```python
    import pika
    import json
    from agent_registry import AgentRegistry, AgentType
    from skillset import Skillset, Skill
    # 假设 text_cleaner_implementation 和 language_detector_implementation 已定义

    class ContentProcessingService:
        def __init__(self, agent_registry: AgentRegistry, skillset: Skillset):
            self.agent_registry = agent_registry
            self.skillset = skillset
            self.preprocessing_agent = self.agent_registry.get_agent("preprocessing_agent")
            self.connection = pika.BlockingConnection(pika.ConnectionParameters("rabbitmq"))
            self.channel = self.connection.channel()
            self.channel.queue_declare(queue="news_raw_queue")
            self.channel.queue_declare(queue="news_processed_queue")

        def _text_cleaner_implementation(self, text: str) -> str:
            print(f"[Skill] Cleaning text...")
            # 实际文本清洗逻辑
            return text.replace("\n", " ").strip()

        def _language_detector_implementation(self, text: str) -> str:
            print(f"[Skill] Detecting language...")
            # 实际语言检测逻辑
            return "zh" if "中文" in text else "en"

        def register_skills(self):
            self.skillset.register_skill(Skill(
                id="text_cleaner",
                name="文本清洗",
                description="对文本进行清洗，移除多余空白符、HTML标签等。",
                parameters={"text": {"type": "str", "description": "待清洗文本"}},
                returns={"cleaned_text": {"type": "str", "description": "清洗后的文本"}},
                implementation=self._text_cleaner_implementation
            ))
            self.skillset.register_skill(Skill(
                id="language_detector",
                name="语言检测",
                description="检测文本的语言。",
                parameters={"text": {"type": "str", "description": "待检测文本"}},
                returns={"language": {"type": "str", "description": "检测到的语言代码"}},
                implementation=self._language_detector_implementation
            ))

        def start_consuming(self):
            print("[ContentProcessingService] Waiting for raw news...")
            self.channel.basic_consume(queue="news_raw_queue", on_message_callback=self.process_news, auto_ack=True)
            self.channel.start_consuming()

        def process_news(self, ch, method, properties, body):
            news_data = json.loads(body)
            print(f"[ContentProcessingService] Received raw news: {news_data.get("title")}")

            # Agent 决策：调用 text_cleaner skill
            cleaned_content = self.skillset.get_skill("text_cleaner").execute(text=news_data["raw_content"])
            # Agent 决策：调用 language_detector skill
            language = self.skillset.get_skill("language_detector").execute(text=cleaned_content)

            processed_news_data = {
                "news_id": news_data.get("news_id", "uuid_gen_here"), # 假设有 news_id
                "url": news_data["url"],
                "title": news_data["title"],
                "processed_content": cleaned_content,
                "language": language,
                "query": news_data["query"]
            }
            self.channel.basic_publish(
                exchange="",
                routing_key="news_processed_queue",
                body=json.dumps(processed_news_data)
            )
            print(f"[ContentProcessingService] Published processed news for {news_data.get("title")} to news_processed_queue.")

    # 启动服务示例
    # if __name__ == "__main__":
    #     agent_registry = AgentRegistry()
    #     agent_registry.register_agent(Agent(
    #         id="preprocessing_agent",
    #         name="内容预处理代理",
    #         description="负责对原始新闻内容进行预处理。",
    #         agent_type=AgentType.REVIEW,
    #         llm_config={"model": "mock-llm", "api_key": ""},
    #         prompt_template="你是一个内容预处理专家，请对以下新闻内容进行清洗和语言检测。",
    #         available_skills=["text_cleaner", "language_detector"]
    #     ))
    #     skillset = Skillset()
    #     processing_service = ContentProcessingService(agent_registry, skillset)
    #     processing_service.register_skills()
    #     processing_service.start_consuming()
    ```

*   **`ai_analysis_service.py` (示例)**：
    ```python
    import pika
    import json
    from agent_registry import AgentRegistry, AgentType
    from skillset import Skillset, Skill
    from llm_provider import LLMProvider
    from typing import List, Dict, Any

    class AIAnalysisService:
        def __init__(self, agent_registry: AgentRegistry, skillset: Skillset, llm_provider: LLMProvider):
            self.agent_registry = agent_registry
            self.skillset = skillset
            self.llm_provider = llm_provider
            self.connection = pika.BlockingConnection(pika.ConnectionParameters("rabbitmq"))
            self.channel = self.connection.channel()
            self.channel.queue_declare(queue="news_processed_queue")
            self.channel.queue_declare(queue="news_summarized_queue")
            self.channel.queue_declare(queue="news_bias_detected_queue")
            self.channel.queue_declare(queue="news_evaluated_queue")
            self.channel.queue_declare(queue="news_final_queue")

            # 注册 Agent
            self._register_agents()
            # 注册 Skills
            self._register_skills()

        def _register_agents(self):
            self.agent_registry.register_agent(Agent(
                id="summarization_agent",
                name="新闻摘要代理",
                description="负责生成新闻摘要。",
                agent_type=AgentType.SUMMARIZATION,
                llm_config={"model": "gemini-pro", "api_key": "YOUR_GEMINI_API_KEY"},
                prompt_template="你是一个专业的新闻摘要员，请用简洁明了的语言，从以下新闻内容中提取核心信息，生成一份中英文摘要。新闻内容：{content}",
                available_skills=[]
            ))
            self.agent_registry.register_agent(Agent(
                id="bias_detection_agent",
                name="褒贬性判断代理",
                description="负责判断新闻的褒贬性、是否陈述事实、是否仅报道事情的一方面。",
                agent_type=AgentType.BIAS_DETECTION,
                llm_config={"model": "gpt-4", "api_key": "YOUR_OPENAI_API_KEY"},
                prompt_template="你是一个公正客观的新闻审核员，请分析以下新闻内容，判断其是否存在偏见、是否仅报道事情的一方面、以及事实陈述的准确性。请给出详细的分析报告。新闻内容：{content}",
                available_skills=["fact_checker", "sentiment_analyzer"]
            ))
            self.agent_registry.register_agent(Agent(
                id="evaluation_agent",
                name="新闻评价代理",
                description="负责对新闻进行多维度评价打分（信息密度、真假性、影响力、传播范围）。",
                agent_type=AgentType.EVALUATION,
                llm_config={"model": "gpt-4", "api_key": "YOUR_OPENAI_API_KEY"},
                prompt_template="你是一个资深的新闻评论员，请从信息密度、真假性、影响力、传播范围四个维度，对以下新闻内容进行 1-10 分的评价，并给出简要理由。新闻内容：{content}",
                available_skills=["knowledge_graph_query", "social_media_monitor"]
            ))
            self.agent_registry.register_agent(Agent(
                id="review_agent",
                name="最终审核代理",
                description="负责对其他 Agent 的输出进行最终审核和修正，确保分析质量。",
                agent_type=AgentType.REVIEW,
                llm_config={"model": "gpt-4", "api_key": "YOUR_OPENAI_API_KEY"},
                prompt_template="你是一个严格的最终审核员，请检查以下新闻的摘要、褒贬分析和评价打分，确保其准确性、客观性和完整性。如有不当之处，请进行修正。原始新闻：{original_news}\n摘要：{summary}\n褒贬分析：{bias_analysis}\n评价打分：{evaluation_score}",
                available_skills=[]
            ))

        def _register_skills(self):
            # Mock Skills for AI Analysis Service
            self.skillset.register_skill(Skill(
                id="fact_checker",
                name="事实核查",
                description="调用外部事实核查 API 或知识图谱，验证信息真实性。",
                parameters={"text": {"type": "str", "description": "待核查文本"}},
                returns={"fact_check_result": {"type": "bool", "description": "事实是否属实"}},
                implementation=lambda text: True # Mock implementation
            ))
            self.skillset.register_skill(Skill(
                id="sentiment_analyzer",
                name="情感分析",
                description="对文本进行情感分析，判断其褒贬倾向。",
                parameters={"text": {"type": "str", "description": "待分析文本"}},
                returns={"sentiment": {"type": "str", "description": "情感倾向 (正面/负面/中性)"}},
                implementation=lambda text: "中性" # Mock implementation
            ))
            self.skillset.register_skill(Skill(
                id="knowledge_graph_query",
                name="知识图谱查询",
                description="查询知识图谱验证信息。",
                parameters={"query": {"type": "str", "description": "查询内容"}},
                returns={"kg_result": {"type": "dict", "description": "知识图谱查询结果"}},
                implementation=lambda query: {"found": True} # Mock implementation
            ))
            self.skillset.register_skill(Skill(
                id="social_media_monitor",
                name="社交媒体监控",
                description="评估新闻在社交媒体上的传播范围和影响力。",
                parameters={"news_id": {"type": "str", "description": "新闻ID"}},
                returns={"impact_score": {"type": "int", "description": "影响力分数"}},
                implementation=lambda news_id: 7 # Mock implementation
            ))

        def start_consuming(self):
            print("[AIAnalysisService] Waiting for processed news...")
            self.channel.basic_consume(queue="news_processed_queue", on_message_callback=self.process_news, auto_ack=True)
            self.channel.start_consuming()

        def process_news(self, ch, method, properties, body):
            processed_news_data = json.loads(body)
            news_id = processed_news_data["news_id"]
            content = processed_news_data["processed_content"]
            print(f"[AIAnalysisService] Received processed news: {processed_news_data.get("title")}")

            # 1. Summarization Agent
            summarization_agent = self.agent_registry.get_agent("summarization_agent")
            summary_prompt = summarization_agent.prompt_template.format(content=content)
            summary = self.llm_provider.invoke(summarization_agent.llm_config["model"], summary_prompt)
            self.channel.basic_publish(
                exchange="",
                routing_key="news_summarized_queue",
                body=json.dumps({"news_id": news_id, "summary": summary})
            )
            print(f"[AIAnalysisService] Summarized news {news_id}.")

            # 2. Bias Detection Agent
            bias_detection_agent = self.agent_registry.get_agent("bias_detection_agent")
            bias_prompt = bias_detection_agent.prompt_template.format(content=content)
            # Agent 调用 Skills
            fact_check_result = self.skillset.get_skill("fact_checker").execute(text=content)
            sentiment = self.skillset.get_skill("sentiment_analyzer").execute(text=content)
            bias_analysis = self.llm_provider.invoke(bias_detection_agent.llm_config["model"], bias_prompt + f"\n事实核查结果: {fact_check_result}\n情感分析结果: {sentiment}")
            self.channel.basic_publish(
                exchange="",
                routing_key="news_bias_detected_queue",
                body=json.dumps({"news_id": news_id, "bias_analysis": bias_analysis})
            )
            print(f"[AIAnalysisService] Detected bias for news {news_id}.")

            # 3. Evaluation Agent
            evaluation_agent = self.agent_registry.get_agent("evaluation_agent")
            evaluation_prompt = evaluation_agent.prompt_template.format(content=content)
            # Agent 调用 Skills
            kg_result = self.skillset.get_skill("knowledge_graph_query").execute(query=content)
            impact_score = self.skillset.get_skill("social_media_monitor").execute(news_id=news_id)
            evaluation_score = self.llm_provider.invoke(evaluation_agent.llm_config["model"], evaluation_prompt + f"\n知识图谱查询结果: {kg_result}\n影响力分数: {impact_score}")
            self.channel.basic_publish(
                exchange="",
                routing_key="news_evaluated_queue",
                body=json.dumps({"news_id": news_id, "evaluation_score": evaluation_score})
            )
            print(f"[AIAnalysisService] Evaluated news {news_id}.")

            # 4. Review Agent (需要收集所有结果后触发，这里简化为直接处理)
            # 实际情况中，Review Agent 会监听多个队列，并在所有前置 Agent 完成后才开始工作
            # 这里为了示例，假设所有结果已就绪
            review_agent = self.agent_registry.get_agent("review_agent")
            final_review_prompt = review_agent.prompt_template.format(
                original_news=content,
                summary=summary,
                bias_analysis=bias_analysis,
                evaluation_score=evaluation_score
            )
            final_analysis = self.llm_provider.invoke(review_agent.llm_config["model"], final_review_prompt)
            self.channel.basic_publish(
                exchange="",
                routing_key="news_final_queue",
                body=json.dumps({"news_id": news_id, "final_analysis": final_analysis})
            )
            print(f"[AIAnalysisService] Final review for news {news_id} completed.")

    # 启动服务示例
    # if __name__ == "__main__":
    #     agent_registry = AgentRegistry()
    #     skillset = Skillset()
    #     llm_provider = LLMProvider()
    #     ai_service = AIAnalysisService(agent_registry, skillset, llm_provider)
    #     ai_service.start_consuming()
    ```

**操作**：
1.  在项目根目录下创建 `news_scraper_service.py`、`content_processing_service.py` 和 `ai_analysis_service.py` 文件，并填入上述代码。
2.  在 `agent_registry.py` 中，确保 `AgentType` 枚举包含 `NOTIFICATION` 类型。
3.  更新 `docker-compose.yml`，添加 `news-scraper-service`、`content-processing-service` 和 `ai-analysis-service` 服务。

```yaml
# docker-compose.yml (追加)

  news-scraper-service:
    build:
      context: ./services/news_scraper
      dockerfile: Dockerfile
    depends_on:
      - rabbitmq
    environment:
      PYTHONUNBUFFERED: 1

  content-processing-service:
    build:
      context: ./services/content_processing
      dockerfile: Dockerfile
    depends_on:
      - rabbitmq
    environment:
      PYTHONUNBUFFERED: 1

  ai-analysis-service:
    build:
      context: ./services/ai_analysis
      dockerfile: Dockerfile
    depends_on:
      - rabbitmq
    environment:
      PYTHONUNBUFFERED: 1
      OPENAI_API_KEY: your_openai_api_key # 替换为实际的 API Key
      GEMINI_API_KEY: your_gemini_api_key # 替换为实际的 API Key
```

*   **`services/news_scraper/Dockerfile`**：
    ```dockerfile
    FROM python:3.9-slim-buster
    WORKDIR /app
    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt
    COPY . .
    CMD ["python", "news_scraper_service.py"]
    ```

*   **`services/content_processing/Dockerfile`**：
    ```dockerfile
    FROM python:3.9-slim-buster
    WORKDIR /app
    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt
    COPY . .
    CMD ["python", "content_processing_service.py"]
    ```

*   **`services/ai_analysis/Dockerfile`**：
    ```dockerfile
    FROM python:3.9-slim-buster
    WORKDIR /app
    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt
    COPY . .
    CMD ["python", "ai_analysis_service.py"]
    ```

**操作**：
1.  为 `news_scraper_service.py`、`content_processing_service.py` 和 `ai_analysis_service.py` 创建相应的服务目录（例如 `services/news_scraper`），并将 Python 文件和 `Dockerfile` 放入其中。
2.  在每个服务目录下创建 `requirements.txt` 文件，列出所需的 Python 库（例如 `pika`, `openai`, `google-generativeai`）。
3.  执行 `docker-compose up -d --build` 启动所有服务。

## 4. 阶段四：定时推送与 URL 监控

**目标**：实现定时任务调度和 URL 监控功能。

**指令**：

1.  **定时任务调度服务 (Scheduler Service)**：
    *   创建一个 `scheduler_service.py` 文件。
    *   实现一个 `SchedulerService` 类，利用 `AgentRegistry` 获取 `SchedulerAgent` 实例。
    *   该服务应能管理和触发定时任务，例如定期调用 `NewsScraperService` 的 `crawl_news` 方法。
    *   可以使用 `APScheduler` 或 `Celery Beat` 来实现任务调度。

2.  **URL 监控功能**：
    *   在 `skillset.py` 中添加 `URLMonitorSkill` 的实现。
    *   `URLMonitorSkill` 接收 URL 和监控频率，定期检查 URL 内容变化。
    *   如果检测到变化，触发 `NotificationAgent` 发送通知。

3.  **推送服务 (Push Service)**：
    *   创建一个 `notification_service.py` 文件。
    *   实现一个 `NotificationService` 类，监听 RabbitMQ 消息队列（例如 `news_notifications_queue`）。
    *   利用 `AgentRegistry` 获取 `NotificationAgent` 实例，并调用 `EmailSenderSkill`、`AppNotifierSkill` 等 Skills 进行个性化新闻推送。

**文件修改示例**：

*   **`scheduler_service.py` (示例)**：
    ```python
    from apscheduler.schedulers.blocking import BlockingScheduler
    import pika
    import json
    from agent_registry import AgentRegistry, AgentType
    from skillset import Skillset

    class SchedulerService:
        def __init__(self, agent_registry: AgentRegistry, skillset: Skillset):
            self.agent_registry = agent_registry
            self.skillset = skillset
            self.scheduler_agent = self.agent_registry.get_agent("scheduler_agent")
            self.scheduler = BlockingScheduler()
            self.connection = pika.BlockingConnection(pika.ConnectionParameters("rabbitmq"))
            self.channel = self.connection.channel()

            # 注册 Agent
            self._register_agents()
            # 注册 Skills
            self._register_skills()

        def _register_agents(self):
            self.agent_registry.register_agent(Agent(
                id="scheduler_agent",
                name="调度代理",
                description="负责管理和触发定时任务。",
                agent_type=AgentType.SCHEDULER,
                llm_config={"model": "mock-llm", "api_key": ""},
                prompt_template="你是一个任务调度专家，请根据以下指令安排和触发任务：{task_description}",
                available_skills=["trigger_news_crawl", "monitor_url", "send_notification"]
            ))
            self.agent_registry.register_agent(Agent(
                id="notification_agent",
                name="通知代理",
                description="负责发送个性化通知。",
                agent_type=AgentType.NOTIFICATION,
                llm_config={"model": "mock-llm", "api_key": ""},
                prompt_template="你是一个通知专家，请根据以下内容向用户发送通知：{notification_content}",
                available_skills=["email_sender"]
            ))

        def _register_skills(self):
            self.skillset.register_skill(Skill(
                id="trigger_news_crawl",
                name="触发新闻抓取",
                description="触发新闻抓取服务进行新闻抓取。",
                parameters={"query": {"type": "str", "description": "抓取关键词"}},
                returns={"status": {"type": "str", "description": "抓取任务状态"}},
                implementation=self._trigger_news_crawl_implementation
            ))
            self.skillset.register_skill(Skill(
                id="monitor_url",
                name="监控URL",
                description="定期检查指定URL内容变化。",
                parameters={"url": {"type": "str", "description": "待监控URL"}, "interval": {"type": "int", "description": "监控间隔（秒）"}},
                returns={"status": {"type": "str", "description": "监控任务状态"}},
                implementation=self._monitor_url_implementation
            ))
            self.skillset.register_skill(Skill(
                id="email_sender",
                name="邮件发送",
                description="发送电子邮件通知。",
                parameters={"to": {"type": "str", "description": "收件人邮箱"}, "subject": {"type": "str", "description": "邮件主题"}, "body": {"type": "str", "description": "邮件内容"}},
                returns={"status": {"type": "str", "description": "发送状态"}},
                implementation=lambda to, subject, body: f"Email sent to {to} with subject {subject}" # Mock implementation
            ))

        def _trigger_news_crawl_implementation(self, query: str):
            print(f"[Skill] Triggering news crawl for: {query}")
            # 向 news_scraper_service 发送消息触发抓取
            self.channel.basic_publish(
                exchange="",
                routing_key="news_crawl_trigger_queue", # 新增一个队列用于触发抓取
                body=json.dumps({"query": query})
            )
            return "Crawl triggered"

        def _monitor_url_implementation(self, url: str, interval: int):
            print(f"[Skill] Monitoring URL: {url} every {interval} seconds.")
            # 实际的 URL 监控逻辑，这里简化为打印
            # 可以在这里启动一个独立的线程或使用 APScheduler 内部的 job
            def check_url_content():
                print(f"[URLMonitor] Checking {url}...")
                # 模拟内容变化
                import random
                if random.random() > 0.8: # 20% 概率变化
                    notification_agent = self.agent_registry.get_agent("notification_agent")
                    notification_prompt = notification_agent.prompt_template.format(notification_content=f"URL {url} 内容发生变化！")
                    self.skillset.get_skill("email_sender").execute(to="user@example.com", subject="URL 变化通知", body=notification_prompt)
                    print(f"[URLMonitor] URL {url} changed, notification sent.")

            self.scheduler.add_job(check_url_content, "interval", seconds=interval, id=f"url_monitor_{url}")
            return "URL monitoring started"

        def start_scheduler(self):
            print("[SchedulerService] Starting scheduler...")
            # 示例：每隔 5 分钟触发一次新闻抓取
            self.scheduler.add_job(self.scheduler_agent.available_skills[0], "interval", minutes=5, args=["AI Agent 最新进展"], id="daily_news_crawl")
            self.scheduler.start()

    # 启动服务示例
    # if __name__ == "__main__":
    #     agent_registry = AgentRegistry()
    #     skillset = Skillset()
    #     scheduler_service = SchedulerService(agent_registry, skillset)
    #     scheduler_service.start_scheduler()
    ```

*   **`notification_service.py` (示例)**：
    ```python
    import pika
    import json
    from agent_registry import AgentRegistry, AgentType
    from skillset import Skillset, Skill

    class NotificationService:
        def __init__(self, agent_registry: AgentRegistry, skillset: Skillset):
            self.agent_registry = agent_registry
            self.skillset = skillset
            self.notification_agent = self.agent_registry.get_agent("notification_agent")
            self.connection = pika.BlockingConnection(pika.ConnectionParameters("rabbitmq"))
            self.channel = self.connection.channel()
            self.channel.queue_declare(queue="news_notifications_queue")

            # 注册 Agent (如果尚未注册)
            if "notification_agent" not in [agent.id for agent in self.agent_registry.list_agents()]:
                self.agent_registry.register_agent(Agent(
                    id="notification_agent",
                    name="通知代理",
                    description="负责发送个性化通知。",
                    agent_type=AgentType.NOTIFICATION,
                    llm_config={"model": "mock-llm", "api_key": ""},
                    prompt_template="你是一个通知专家，请根据以下内容向用户发送通知：{notification_content}",
                    available_skills=["email_sender"]
                ))
            # 注册 Skills (如果尚未注册)
            if "email_sender" not in [skill.id for skill in self.skillset.list_skills()]:
                self.skillset.register_skill(Skill(
                    id="email_sender",
                    name="邮件发送",
                    description="发送电子邮件通知。",
                    parameters={"to": {"type": "str", "description": "收件人邮箱"}, "subject": {"type": "str", "description": "邮件主题"}, "body": {"type": "str", "description": "邮件内容"}},
                    returns={"status": {"type": "str", "description": "发送状态"}},
                    implementation=lambda to, subject, body: f"Email sent to {to} with subject {subject}" # Mock implementation
                ))

        def start_consuming(self):
            print("[NotificationService] Waiting for notifications...")
            self.channel.basic_consume(queue="news_notifications_queue", on_message_callback=self.process_notification, auto_ack=True)
            self.channel.start_consuming()

        def process_notification(self, ch, method, properties, body):
            notification_data = json.loads(body)
            user_id = notification_data.get("user_id")
            notification_content = notification_data.get("content")
            print(f"[NotificationService] Received notification for user {user_id}: {notification_content}")

            # 假设根据 user_id 获取用户邮箱
            user_email = "user@example.com" # 实际应从数据库获取
            subject = "您的新闻推送"

            # Agent 决策：调用 email_sender skill
            notification_prompt = self.notification_agent.prompt_template.format(notification_content=notification_content)
            send_status = self.skillset.get_skill("email_sender").execute(to=user_email, subject=subject, body=notification_prompt)
            print(f"[NotificationService] Notification sent status: {send_status}")

    # 启动服务示例
    # if __name__ == "__main__":
    #     agent_registry = AgentRegistry()
    #     skillset = Skillset()
    #     notification_service = NotificationService(agent_registry, skillset)
    #     notification_service.start_consuming()
    ```

**操作**：
1.  在项目根目录下创建 `scheduler_service.py` 和 `notification_service.py` 文件，并填入上述代码。
2.  更新 `docker-compose.yml`，添加 `scheduler-service` 和 `notification-service` 服务。

```yaml
# docker-compose.yml (追加)

  scheduler-service:
    build:
      context: ./services/scheduler
      dockerfile: Dockerfile
    depends_on:
      - rabbitmq
      - news-scraper-service # 依赖于新闻抓取服务
    environment:
      PYTHONUNBUFFERED: 1

  notification-service:
    build:
      context: ./services/notification
      dockerfile: Dockerfile
    depends_on:
      - rabbitmq
    environment:
      PYTHONUNBUFFERED: 1
```

*   **`services/scheduler/Dockerfile`**：
    ```dockerfile
    FROM python:3.9-slim-buster
    WORKDIR /app
    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt
    COPY . .
    CMD ["python", "scheduler_service.py"]
    ```

*   **`services/notification/Dockerfile`**：
    ```dockerfile
    FROM python:3.9-slim-buster
    WORKDIR /app
    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt
    COPY . .
    CMD ["python", "notification_service.py"]
    ```

**操作**：
1.  为 `scheduler_service.py` 和 `notification_service.py` 创建相应的服务目录（例如 `services/scheduler`），并将 Python 文件和 `Dockerfile` 放入其中。
2.  在每个服务目录下创建 `requirements.txt` 文件，列出所需的 Python 库（例如 `pika`, `APScheduler`）。
3.  执行 `docker-compose up -d --build` 启动所有服务。

## 5. 阶段五：API 接口与前端集成

**目标**：完善 API 网关，提供与前端交互的接口，并实现 Agent/Skill 配置的 CRUD 操作。

**指令**：

1.  **API 网关增强**：
    *   在 `gateway/app.js` 中添加更多路由，用于与新闻服务、Agent 配置服务、Skill 配置服务交互。
    *   实现新闻内容的查询、筛选、详情接口。
    *   实现用户订阅管理、偏好设置接口。
    *   实现 Agent 和 Skill 配置的 CRUD 接口，允许通过 API 动态管理 Agent 和 Skill。

2.  **Agent 配置服务**：
    *   创建一个新的 Node.js 或 Python 服务（例如 `agent_config_service.py`），负责 Agent 配置的持久化存储和管理。
    *   该服务直接与 MongoDB 交互，存储 `Agent` 实例的配置信息。

3.  **Skill 配置服务**：
    *   创建一个新的 Node.js 或 Python 服务（例如 `skill_config_service.py`），负责 Skill 配置的持久化存储和管理。
    *   该服务直接与 MongoDB 交互，存储 `Skill` 实例的元数据。

**文件修改示例**：

*   **`gateway/app.js` (追加路由示例)**：
    ```javascript
    // ... (现有代码)

    // Agent 配置服务路由转发
    app.use("/api/agents", authenticateToken, (req, res) => {
        // 假设 Agent 配置服务运行在 http://agent-config-service:3003
        axios({ method: req.method, url: `http://agent-config-service:3003${req.url}`, headers: req.headers, data: req.body })
            .then(response => res.json(response.data))
            .catch(error => res.status(error.response?.status || 500).send(error.message));
    });

    // Skill 配置服务路由转发
    app.use("/api/skills", authenticateToken, (req, res) => {
        // 假设 Skill 配置服务运行在 http://skill-config-service:3004
        axios({ method: req.method, url: `http://skill-config-service:3004${req.url}`, headers: req.headers, data: req.body })
            .then(response => res.json(response.data))
            .catch(error => res.status(error.response?.status || 500).send(error.message));
    });

    // ... (其他新闻、订阅等服务路由)
    ```

*   **`agent_config_service.py` (示例)**：
    ```python
    from flask import Flask, request, jsonify
    from pymongo import MongoClient
    from agent_registry import Agent, AgentType # 导入 Agent 和 AgentType
    import json

    app = Flask(__name__)
    client = MongoClient("mongodb://mongodb:27017/")
    db = client.agent_config_db
    agents_collection = db.agents

    @app.route("/agents", methods=["POST"])
    def create_agent():
        data = request.json
        # 确保 agent_type 是 AgentType 枚举的有效值
        try:
            data["agent_type"] = AgentType[data["agent_type"]].value
        except KeyError:
            return jsonify({"error": "Invalid AgentType"}), 400
        
        agent_id = agents_collection.insert_one(data).inserted_id
        return jsonify({"message": "Agent created", "id": str(agent_id)}), 201

    @app.route("/agents", methods=["GET"])
    def get_agents():
        agents = []
        for agent in agents_collection.find():
            agent["_id"] = str(agent["_id"])
            agents.append(agent)
        return jsonify(agents), 200

    @app.route("/agents/<agent_id>", methods=["GET"])
    def get_agent(agent_id):
        agent = agents_collection.find_one({"id": agent_id})
        if agent:
            agent["_id"] = str(agent["_id"])
            return jsonify(agent), 200
        return jsonify({"error": "Agent not found"}), 404

    @app.route("/agents/<agent_id>", methods=["PUT"])
    def update_agent(agent_id):
        data = request.json
        if "agent_type" in data:
            try:
                data["agent_type"] = AgentType[data["agent_type"]].value
            except KeyError:
                return jsonify({"error": "Invalid AgentType"}), 400
        
        result = agents_collection.update_one({"id": agent_id}, {"$set": data})
        if result.matched_count:
            return jsonify({"message": "Agent updated"}), 200
        return jsonify({"error": "Agent not found"}), 404

    @app.route("/agents/<agent_id>", methods=["DELETE"])
    def delete_agent(agent_id):
        result = agents_collection.delete_one({"id": agent_id})
        if result.deleted_count:
            return jsonify({"message": "Agent deleted"}), 204
        return jsonify({"error": "Agent not found"}), 404

    if __name__ == "__main__":
        app.run(host="0.0.0.0", port=3003)
    ```

*   **`skill_config_service.py` (示例)**：
    ```python
    from flask import Flask, request, jsonify
    from pymongo import MongoClient
    import json

    app = Flask(__name__)
    client = MongoClient("mongodb://mongodb:27017/")
    db = client.skill_config_db
    skills_collection = db.skills

    @app.route("/skills", methods=["POST"])
    def create_skill():
        data = request.json
        skill_id = skills_collection.insert_one(data).inserted_id
        return jsonify({"message": "Skill created", "id": str(skill_id)}), 201

    @app.route("/skills", methods=["GET"])
    def get_skills():
        skills = []
        for skill in skills_collection.find():
            skill["_id"] = str(skill["_id"])
            skills.append(skill)
        return jsonify(skills), 200

    @app.route("/skills/<skill_id>", methods=["GET"])
    def get_skill(skill_id):
        skill = skills_collection.find_one({"id": skill_id})
        if skill:
            skill["_id"] = str(skill["_id"])
            return jsonify(skill), 200
        return jsonify({"error": "Skill not found"}), 404

    @app.route("/skills/<skill_id>", methods=["PUT"])
    def update_skill(skill_id):
        data = request.json
        result = skills_collection.update_one({"id": skill_id}, {"$set": data})
        if result.matched_count:
            return jsonify({"message": "Skill updated"}), 200
        return jsonify({"error": "Skill not found"}), 404

    @app.route("/skills/<skill_id>", methods=["DELETE"])
    def delete_skill(skill_id):
        result = skills_collection.delete_one({"id": skill_id})
        if result.deleted_count:
            return jsonify({"message": "Skill deleted"}), 204
        return jsonify({"error": "Skill not found"}), 404

    if __name__ == "__main__":
        app.run(host="0.0.0.0", port=3004)
    ```

**操作**：
1.  在项目根目录下创建 `agent_config_service.py` 和 `skill_config_service.py` 文件，并填入上述代码。
2.  更新 `docker-compose.yml`，添加 `agent-config-service` 和 `skill-config-service` 服务。

```yaml
# docker-compose.yml (追加)

  agent-config-service:
    build:
      context: ./services/agent_config
      dockerfile: Dockerfile
    depends_on:
      - mongodb
    environment:
      PYTHONUNBUFFERED: 1

  skill-config-service:
    build:
      context: ./services/skill_config
      dockerfile: Dockerfile
    depends_on:
      - mongodb
    environment:
      PYTHONUNBUFFERED: 1
```

*   **`services/agent_config/Dockerfile`**：
    ```dockerfile
    FROM python:3.9-slim-buster
    WORKDIR /app
    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt
    COPY . .
    CMD ["python", "agent_config_service.py"]
    ```

*   **`services/skill_config/Dockerfile`**：
    ```dockerfile
    FROM python:3.9-slim-buster
    WORKDIR /app
    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt
    COPY . .
    CMD ["python", "skill_config_service.py"]
    ```

**操作**：
1.  为 `agent_config_service.py` 和 `skill_config_service.py` 创建相应的服务目录（例如 `services/agent_config`），并将 Python 文件和 `Dockerfile` 放入其中。
2.  在每个服务目录下创建 `requirements.txt` 文件，列出所需的 Python 库（例如 `Flask`, `pymongo`）。
3.  执行 `docker-compose up -d --build` 启动所有服务。

## 6. 总结与下一步

本指导文件提供了详细的后端改造步骤，涵盖了从基础架构搭建到核心 Agent 功能实现的各个方面。IDE 工具应根据本文件的指令，逐步生成和修改代码。

**下一步**：

*   **测试**：对每个服务进行单元测试和集成测试，确保功能正常。
*   **Prompt 优化**：根据实际效果，持续优化 Agent 的 Prompt 模板，提高 LLM 的分析质量。
*   **监控与日志**：集成监控和日志系统，便于问题排查和性能优化。
*   **安全性**：加强 API 接口的安全防护，包括鉴权、限流等。
*   **前端集成**：与前端团队紧密协作，完成新功能的展示和交互。

## 7. 参考文献

*   [1] AI Agent 项目后端开发路径与架构设计方案 (Manus AI, 2026年3月19日)
*   [2] AI Agent 与 Skills 库设计方案 (Manus AI, 2026年3月25日)
*   [3] BettaFish GitHub Repository: [https://github.com/666ghj/BettaFish](https://github.com/666ghj/BettaFish)
*   [4] MiroFish GitHub Repository: [https://github.com/666ghj/MiroFish](https://github.com/666ghj/MiroFish)
*   [5] worldmonitor GitHub Repository: [https://github.com/koala73/worldmonitor](https://github.com/koala73/worldmonitor)
*   [6] open-webSearch GitHub Repository: [https://github.com/Aas-ee/open-webSearch](https://github.com/Aas-ee/open-webSearch)
*   [7] Anthropic's Skills Library: [https://github.com/anthropics/skills](https://github.com/anthropics/skills)
*   [8] Build with Claude (Skills examples): [https://github.com/davepoon/buildwithclaude](https://github.com/davepoon/buildwithclaude)
