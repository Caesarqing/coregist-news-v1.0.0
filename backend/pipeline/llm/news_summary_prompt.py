SUMMARY_OUTPUT_KEYS = ["title_zh", "summary_zh", "title_en", "summary_en"]


def build_summary_system_prompt():
    return """
你是中文新闻编辑，只负责把已清洗的新闻正文提纯成标题和摘要。

输出要求：
1. 只能输出 JSON object，不要输出 markdown、代码块、解释、前后缀文本。
2. 只能使用以下键名：
   ["title_zh", "summary_zh", "title_en", "summary_en"]
3. 中文标题必须自然、完整、新闻化，不能保留网页模板词、来源说明、栏目名或营销口号。
4. 中文摘要必须：
   - 基于正文事实
   - 单段完整句
   - 严格符合用户消息里的目标字数区间，且不超过 120 个汉字
   - 不能截断
   - 按 5W2H 压缩新闻事实：谁、何时、何地、发生了什么、为什么、如何发生、影响或结果
   - 正文没有的 5W2H 信息不要编造
   - 不能出现“作者”“记者”“通讯员”“编辑”“责任编辑”“发布时间”“发稿时间”“来源：”“版权”“免责声明”“相关阅读”“点击查看”“广告”“图/文”等模板词
5. summary_en 必须是自然英文，也不能包含作者、编辑、发布时间、来源说明、版权声明或网页模板词。
6. 无论原始语言是中文、英文、西班牙语、日语、阿拉伯语或其他语言，title_zh 和 summary_zh 都必须是简体中文，不能保留原文长句。
7. title_en 和 summary_en 都必须是自然英文；如果原文不是英文，请翻译/改写为英文，不能留空，也不能保留西班牙语、日语、阿拉伯语等原文。
8. 不要生成标签、分类、评分、评论、解释或其他额外字段。
""".strip()


def build_summary_user_prompt(title, text, source_name="", source_language="", summary_min=50, summary_max=120):
    return f"""
请根据下面的新闻信息输出精炼 JSON。

中文摘要目标：
- summary_zh 字数必须在 {summary_min}-{summary_max} 字之间。
- 优先保留新闻主体、核心事件、原因/方式、影响/结果。
- 删除作者署名、记者信息、编辑信息、发布时间、来源说明、版权声明、图片说明和网页导航信息。

新闻来源：
{source_name}

原始语言：
{source_language}

原始标题：
{title}

新闻正文：
{text}
""".strip()


def build_prompt(title, text, source_name="", source_language="", summary_min=50, summary_max=120):
    return (
        f"{build_summary_system_prompt()}\n\n"
        f"{build_summary_user_prompt(title, text, source_name=source_name, source_language=source_language, summary_min=summary_min, summary_max=summary_max)}"
    )


__all__ = ["SUMMARY_OUTPUT_KEYS", "build_summary_system_prompt", "build_summary_user_prompt", "build_prompt"]
