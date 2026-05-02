import requests, json, os
from dotenv import load_dotenv

load_dotenv()
from pipeline.llm.news_prompt import build_prompt, NEWS_CATEGORY_SCHEMA


def _parse_json_safely(text: str) -> dict:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            core = text[start:end+1]
            return json.loads(core)
        raise


def normalize_news_json(raw: dict) -> dict:
    """
    接受 qwen 输出的原始 dict，兼容它乱用键名的情况，
    统一转成：
    summary_en, summary_zh, score, level1_code, level2_codes, tags_en, tags_zh
    """

    title_en = (
            raw.get("title_en")
            or raw.get("title")
            or raw.get("english_title")
            or raw.get("titleEnglish")
            or ""
    )
    title_zh = (
            raw.get("title_zh")
            or raw.get("title_cn")
            or raw.get("chinese_title")
            or raw.get("titleZh")
            or ""
    )

    # 1) 英文摘要
    summary_en = (
        raw.get("summary_en")
        or raw.get("summary")
        or raw.get("english_summary")
        or raw.get("summaryEnglish")
        or ""
    )

    # 2) 中文摘要
    summary_zh = (
        raw.get("summary_zh")
        or raw.get("chinese_summary")
        or raw.get("summary_cn")
        or raw.get("summaryZh")
        or ""
    )

    # 3) 分数
    score = raw.get("score", raw.get("rating", 0))
    try:
        score = int(score)
    except Exception:
        score = 0
    if score < 1 or score > 10:
        score = 0

    # 4) 一级分类
    level1_code = (
        raw.get("level1_code")
        or raw.get("level1")
        or (raw.get("category", {}) or {}).get("level1")
        or ""
    )

    # 5) 二级分类列表
    level2_codes = (
        raw.get("level2_codes")
        or raw.get("level2")
        or (raw.get("category", {}) or {}).get("level2")
        or []
    )
    if isinstance(level2_codes, str):
        level2_codes = [level2_codes]
    level2_codes = [str(c).strip() for c in level2_codes if str(c).strip()]

    # 6) 标签：英文 + 中文
    tags_en = raw.get("tags_en") or raw.get("tagsEnglish") or []
    tags_zh = raw.get("tags_zh") or raw.get("tagsChinese") or []

    if isinstance(tags_en, str):
        tags_en = [tags_en]
    if isinstance(tags_zh, str):
        tags_zh = [tags_zh]

    tags_en = [str(t).strip() for t in tags_en if str(t).strip()]
    tags_zh = [str(t).strip() for t in tags_zh if str(t).strip()]

    # 如果长度不一致，用较短的为准截断；或者干脆只保留英文
    if len(tags_en) != len(tags_zh):
        if not tags_zh:
            # 没有中文，就直接复制一份英文当中文，至少先不崩
            tags_zh = tags_en[:]
        else:
            n = min(len(tags_en), len(tags_zh))
            tags_en = tags_en[:n]
            tags_zh = tags_zh[:n]

    return {
        "title_en": title_en,
        "title_zh": title_zh,
        "summary_en": summary_en,
        "summary_zh": summary_zh,
        "score": score,
        "level1_code": level1_code,
        "level2_codes": level2_codes,
        "tags_en": tags_en,
        "tags_zh": tags_zh,
    }


def resolve_category_names(level1_code: str, level2_codes: list[str]):
    """
    输入：
      - level1_code: 如 "healthcare"
      - level2_codes: 如 ["public_health", "epidemic_disease"]
    输出：
      - level1_name_zh, level1_name_en
      - level2_names_zh (list)
      - level2_names_en (list)
    """

    schema = NEWS_CATEGORY_SCHEMA

    # 1) 先拿一级类的元信息
    l1_meta = schema.get(level1_code)
    if not l1_meta:
        # 找不到就给一个兜底
        level1_name_zh = "其他"
        level1_name_en = "Other"
        return level1_name_zh, level1_name_en, [], []

    level1_name_zh = l1_meta["name_zh"]
    level1_name_en = l1_meta.get("name_en", "")

    # 2) 遍历二级 code，去 sub 里查中英文名
    l2_schema = l1_meta["sub"]
    level2_names_zh = []
    level2_names_en = []

    for code in level2_codes:
        sub = l2_schema.get(code)
        if not sub:
            # 二级没找到也给个兜底
            level2_names_zh.append("其他")
            level2_names_en.append("Other")
        else:
            level2_names_zh.append(sub["zh"])
            level2_names_en.append(sub["en"])

    return level1_name_zh, level1_name_en, level2_names_zh, level2_names_en


def chat_with_dmaxapi(title, text):
    url = "https://www.dmxapi.cn/v1/chat/completions"
    raw_api_key = (os.getenv("DMAX_API") or "").strip()
    auth_header = raw_api_key if raw_api_key.lower().startswith("bearer ") else f"Bearer {raw_api_key}"

    # 请求头配置
    headers = {
        "Authorization": auth_header,
        "Content-Type": "application/json"
    }

    payload = {
        "model": "Qwen3.5-2B-free",
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful assistant."  # 系统提示词：定义 AI 助手的角色
            },
            {
                "role": "user",
                "content": build_prompt(title, text)  # 用户问题
            }
        ],
        "stream": False,
        "format": "json"
    }

    # proxies={"http": None, "https": None} 的意思是：完全不要用任何代理
    resp = requests.post(url, headers=headers, data=json.dumps(payload))
    resp.raise_for_status()
    data = resp.json()

    raw_content = data["choices"][0]["message"]["content"]
    raw_json = _parse_json_safely(raw_content)
    normalized = normalize_news_json(raw_json)
    return normalized


if __name__ == "__main__":
    title="Many of the support measures were credited with propping up the economy throughout the Covid lockdowns",
    text="""
            Sperm from donor with cancer-causing gene was used to conceive almost 200 children
A sperm donor who unknowingly harboured a genetic mutation that dramatically raises the risk of cancer has fathered at least 197 children across Europe, a major investigation has revealed.
Some children have already died and only a minority who inherit the mutation will escape cancer in their lifetimes.
The sperm was not sold to UK clinics, but the BBC can confirm a "very small" number of British families, who have been informed, used the donor's sperm while having fertility treatment in Denmark.
Denmark's European Sperm Bank, which sold the sperm, said families affected had their "deepest sympathy" and admitted the sperm was used to make too many babies in some countries.
Up to 20% of the donor's sperm contains the dangerous mutation that increases the risk of cancer (stock image)
The investigation has been conducted by 14 public service broadcasters, including the BBC, as part of the European Broadcasting Union's Investigative Journalism Network.
The sperm came from an anonymous man who was paid to donate as a student, starting in 2005. His sperm was then used by women for around 17 years.
He is healthy and passed the donor screening checks. However, the DNA in some of his cells mutated before he was born.
It damaged the TP53 gene – which has the crucial role of preventing the body's cells turning cancerous.
Most of the donor's body does not contain the dangerous form of TP53, but up to 20% of his sperm do.
However, any children made from affected sperm will have the mutation in every cell of their body.
This is known as Li Fraumeni syndrome and comes with an up to 90% chance of developing cancer, particularly during childhood as well as breast cancer later in life.
"It is a dreadful diagnosis," Prof Clare Turnbull, a cancer geneticist at the Institute of Cancer Research in London, told the BBC. "It's a very challenging diagnosis to land on a family, there is a lifelong burden of living with that risk, it's clearly devastating."
MRI scans of the body and the brain are needed every year, as well as abdominal ultrasounds, to try to spot tumours. Women often choose to have their breasts removed to lower their risk of cancer.
The European Sperm Bank said the "donor himself and his family members are not ill" and such a mutation is "not detected preventatively by genetic screening". They said they "immediately blocked" the donor once the problem with his sperm was discovered.
Children have died
Doctors who were seeing children with cancer linked to sperm donation raised concerns at the European Society of Human Genetics this year.
They reported they had found 23 with the variant out of 67 children known at the time. Ten had already been diagnosed with cancer.
Through Freedom of Information requests and interviews with doctors and patients we can reveal substantially more children were born to the donor.
The figure is at least 197 children, but that may not be the final number as data has not been obtained from all countries.
It is also unknown how many of these children inherited the dangerous variant.
Dr Kasper has been helping some of the families affected
Dr Edwige Kasper, a cancer geneticist at Rouen University Hospital, in France, who presented the initial data, told the investigation: "We have many children that have already developed a cancer.
"We have some children that have developed already two different cancers and some of them have already died at a very early age."
Céline, not her real name, is a single-mother in France whose child was conceived with the donor's sperm 14 years ago and has the mutation.
She got a call from the fertility clinic she used in Belgium urging her to get her daughter screened.
She says she has "absolutely no hard feelings" towards the donor but says it was unacceptable she was given sperm that "wasn't clean, that wasn't safe, that carried a risk".
And she knows cancer will be looming over them for the rest of their lives.
"We don't know when, we don't know which one, and we don't know how many," she says.
"I understand that there's a high chance it's going to happen and when it does, we'll fight and if there are several, we'll fight several times."
The donor's sperm was used by 67 fertility clinics in 14 countries.
The sperm was not sold to UK clinics.
However, as a result of this investigation the authorities in Denmark notified the UK's Human Fertilisation and Embryology Authority (HFEA) on Monday that British women had travelled to the country to receive fertility treatment using the donor's sperm.
Those women have been informed.
Peter Thompson, the chief executive of the HFEA, said a "very small number" of women were affected and "they have been told about the donor by the Danish clinic at which they were treated".
We do not know if any British women had treatment in other countries where the donor's sperm was distributed.
Concerned parents are advised to contact the clinic they used and the fertility authority in that country.
The BBC is choosing not to release the donor's identification number because he donated in good faith and the known cases in the UK have been contacted.
There is no law on how many times a donor's sperm can be used worldwide. However, individual countries do set their own limits.
The European Sperm Bank accepted these limits had "unfortunately" been breached in some countries and it was "in dialogue with the authorities in Denmark and Belgium".
In Belgium, a single sperm donor is only supposed to be used by six families. Instead 38 different women produced 53 children to the donor.
The UK limit is 10 families per donor.
'You can't screen for everything'
Prof Allan Pacey, who used to run the Sheffield Sperm Bank and is now the deputy vice president of the Faculty of Biology Medicine and Health at the University of Manchester, said countries had become dependent on big international sperm banks and half the UK's sperm was now imported.
He told the BBC: "We have to import from big international sperm banks who are also selling it to other countries, because that's how they make their money, and that is where the problem begins, because there's no international law about how often you can use the sperm."
He said the case was "awful" for everybody involved, but it would be impossible to make sperm completely safe.
"You can't screen for everything, we only accept 1% or 2% of all men that apply to be a sperm donor in the current screening arrangement so if we make it even tighter, we wouldn't have any sperm donors – that's where the balance lies."
Sperm donor who fathered 550 children told to stop
IVF births now represent one child in every classroom, data suggests
This case, alongside that of a man who was ordered to stop after fathering 550 children through sperm donation, has again raised questions over whether there should be tougher limits.
The European Society of Human Reproduction and Embryology has recently suggested a limit of 50 families per donor.
However, it said this would not reduce the risk of inheriting rare genetic diseases.
Rather, it would be better for the wellbeing of children who discover they are one of hundreds of half-siblings.
"More needs to be done to reduce the number of families that are born globally from the same donors," said Sarah Norcross, the director of the Progress Educational Trust, an independent charity for people affected by infertility and genetic conditions.
"We don't fully understand what the social and psychological implications will be of having these hundreds of half siblings. It can potentially be traumatic," she told BBC News.
The European Sperm Bank said: "It is important, especially in light of this case, to remember that thousands of women
            """

    reply = chat_with_dmaxapi(title, text)
    print(reply)
