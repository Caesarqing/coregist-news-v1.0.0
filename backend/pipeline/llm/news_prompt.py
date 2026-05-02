# 新闻分类体系（一级 + 二级），只用 code + 中文名，GPT 只输出 code，你在代码里做映射
NEWS_CATEGORY_SCHEMA = {
    # 1. 时政要闻
    "current_affairs": {
        "name_zh": "时政要闻",
        "name_en": "Current Affairs",
        "sub": {
            "natl_leadership": {
                "zh": "国家领导人活动",
                "en": "National leadership activities",
            },
            "key_meetings": {
                "zh": "重要会议与报告",
                "en": "Key meetings and reports",
            },
            "policy_laws": {
                "zh": "政策法规发布",
                "en": "Policy and law release",
            },
            "regional_governance": {
                "zh": "地方政务与治理",
                "en": "Regional governance",
            },
            "party_building": {
                "zh": "党建与党务",
                "en": "Party building and party affairs",
            },
            "hmt_affairs": {
                "zh": "港澳台事务",
                "en": "Hong Kong, Macao and Taiwan affairs",
            },
            "national_strategies": {
                "zh": "国家战略与规划",
                "en": "National strategies and planning",
            },
        },
    },

    # 2. 经济社会
    "economy_society": {
        "name_zh": "经济社会",
        "name_en": "Economy & Society",
        "sub": {
            "macro_economy": {
                "zh": "宏观经济",
                "en": "Macroeconomy",
            },
            "employment_income": {
                "zh": "就业与收入",
                "en": "Employment and income",
            },
            "social_security": {
                "zh": "社会保障",
                "en": "Social security",
            },
            "urban_rural_dev": {
                "zh": "城乡发展",
                "en": "Urban–rural development",
            },
            "real_estate": {
                "zh": "房地产市场",
                "en": "Real estate market",
            },
            "consumption_market": {
                "zh": "消费市场",
                "en": "Consumption market",
            },
            "demographics": {
                "zh": "人口与社会结构",
                "en": "Demographics and social structure",
            },
            "digital_economy": {
                "zh": "数字经济与平台经济",
                "en": "Digital and platform economy",
            },
        },
    },

    # 3. 国际外交
    "international_affairs": {
        "name_zh": "国际外交",
        "name_en": "International Affairs",
        "sub": {
            "diplomatic_visits": {
                "zh": "外交访问与会晤",
                "en": "Diplomatic visits and meetings",
            },
            "intl_orgs": {
                "zh": "国际组织与多边机制",
                "en": "International organizations and multilateral mechanisms",
            },
            "geopolitics_conflict": {
                "zh": "地缘政治与冲突",
                "en": "Geopolitics and conflicts",
            },
            "intl_cooperation": {
                "zh": "国际合作与发展",
                "en": "International cooperation and development",
            },
            "global_governance": {
                "zh": "全球治理与规则",
                "en": "Global governance and rules",
            },
            "region_europe": {
                "zh": "欧洲地区事务",
                "en": "Europe affairs",
            },
            "region_americas": {
                "zh": "美洲地区事务",
                "en": "Americas affairs",
            },
            "region_asia_africa": {
                "zh": "亚非及其他地区事务",
                "en": "Asia, Africa and other regions",
            },
        },
    },

    # 4. 科学技术
    "science_technology": {
        "name_zh": "科学技术",
        "name_en": "Science & Technology",
        "sub": {
            "it_internet_ai": {
                "zh": "信息技术与人工智能",
                "en": "IT, Internet & AI",
            },
            "telecom_5g": {
                "zh": "通信与5G/6G",
                "en": "Telecom and 5G/6G",
            },
            "space_aerospace": {
                "zh": "航天航空",
                "en": "Space and aerospace",
            },
            "basic_science": {
                "zh": "基础科学研究",
                "en": "Basic scientific research",
            },
            "applied_innovation": {
                "zh": "应用技术与创新",
                "en": "Applied technology and innovation",
            },
            "env_climate_science": {
                "zh": "环境与气候科学",
                "en": "Environmental and climate science",
            },
            "sci_policy_industry": {
                "zh": "科技政策与产业",
                "en": "Science policy and industry",
            },
        },
    },

    # 5. 财经金融
    "finance_business": {
        "name_zh": "财经金融",
        "name_en": "Finance & Business",
        "sub": {
            "financial_markets": {
                "zh": "金融市场",
                "en": "Financial markets",
            },
            "banking_insurance": {
                "zh": "银行与保险",
                "en": "Banking and insurance",
            },
            "securities_funds": {
                "zh": "证券与基金",
                "en": "Securities and funds",
            },
            "industry_corporate": {
                "zh": "企业动态与产业经济",
                "en": "Corporate and industrial economy",
            },
            "trade_investment": {
                "zh": "对外贸易与投资",
                "en": "Foreign trade and investment",
            },
            "finance_regulation": {
                "zh": "金融监管与风险",
                "en": "Financial regulation and risk",
            },
            "startup_venture": {
                "zh": "创业与创投",
                "en": "Startups and venture capital",
            },
            "personal_finance": {
                "zh": "个人理财与消费金融",
                "en": "Personal finance and consumer finance",
            },
        },
    },

    # 6. 文体娱乐
    "culture_sports_entertainment": {
        "name_zh": "文体娱乐",
        "name_en": "Culture, Sports & Entertainment",
        "sub": {
            "culture_policy_industry": {
                "zh": "文化政策与产业",
                "en": "Culture policy and industry",
            },
            "literature_art": {
                "zh": "文学与艺术",
                "en": "Literature and arts",
            },
            "film_tv_music": {
                "zh": "影视与音乐",
                "en": "Film, TV and music",
            },
            "celebrity_public_figures": {
                "zh": "公众人物与明星",
                "en": "Celebrities and public figures",
            },
            "sports_events": {
                "zh": "竞技体育赛事",
                "en": "Sports events",
            },
            "mass_sports": {
                "zh": "全民健身与大众体育",
                "en": "Mass sports and fitness",
            },
            "games_anime": {
                "zh": "游戏与动漫",
                "en": "Games and animation",
            },
            "cultural_heritage": {
                "zh": "非遗与传统文化",
                "en": "Intangible heritage and tradition",
            },
        },
    },

    # 7. 法治社会
    "law_society": {
        "name_zh": "法治社会",
        "name_en": "Law & Society",
        "sub": {
            "legislation_judiciary": {
                "zh": "立法与司法",
                "en": "Legislation and judiciary",
            },
            "typical_cases": {
                "zh": "典型案件报道",
                "en": "Typical case reports",
            },
            "public_security": {
                "zh": "公安与治安管理",
                "en": "Public security and policing",
            },
            "anti_corruption": {
                "zh": "反腐倡廉",
                "en": "Anti-corruption and integrity",
            },
            "cyber_governance": {
                "zh": "网络与数据治理",
                "en": "Cyber and data governance",
            },
            "rights_protection": {
                "zh": "权利保护与维权",
                "en": "Rights protection",
            },
            "rule_of_law_building": {
                "zh": "法治建设与普法",
                "en": "Rule-of-law building and legal education",
            },
        },
    },

    # 8. 卫生健康
    "healthcare": {
        "name_zh": "卫生健康",
        "name_en": "Health & Healthcare",
        "sub": {
            "public_health": {
                "zh": "公共卫生与防控",
                "en": "Public health and prevention",
            },
            "epidemic_disease": {
                "zh": "疫情与传染病",
                "en": "Epidemics and infectious diseases",
            },
            "medical_services": {
                "zh": "医疗服务与医改",
                "en": "Medical services and reform",
            },
            "pharma_vaccines": {
                "zh": "药品、疫苗与研发",
                "en": "Drugs, vaccines and R&D",
            },
            "health_lifestyle": {
                "zh": "健康生活与科普",
                "en": "Healthy lifestyle and popular science",
            },
            "mental_health": {
                "zh": "心理健康",
                "en": "Mental health",
            },
            "health_policy": {
                "zh": "卫生健康政策",
                "en": "Health policy",
            },
        },
    },

    # 9. 教育人才
    "education_talent": {
        "name_zh": "教育人才",
        "name_en": "Education & Talent",
        "sub": {
            "edu_policy_reform": {
                "zh": "教育政策与改革",
                "en": "Education policy and reform",
            },
            "basic_education": {
                "zh": "基础教育",
                "en": "Basic education",
            },
            "higher_education": {
                "zh": "高等教育",
                "en": "Higher education",
            },
            "vocational_education": {
                "zh": "职业教育",
                "en": "Vocational education",
            },
            "exams_admission": {
                "zh": "考试招生",
                "en": "Exams and admissions",
            },
            "research_academia": {
                "zh": "科研与学术",
                "en": "Research and academia",
            },
            "talent_programs": {
                "zh": "人才培养与引进",
                "en": "Talent cultivation and introduction",
            },
        },
    },

    # 10. 军事国防
    "military_defense": {
        "name_zh": "军事国防",
        "name_en": "Military & Defense",
        "sub": {
            "defense_policy": {
                "zh": "国防政策与战略",
                "en": "Defense policy and strategy",
            },
            "forces_building": {
                "zh": "军队建设",
                "en": "Armed forces building",
            },
            "defense_tech_equipment": {
                "zh": "武器装备与国防科技",
                "en": "Equipment and defense technology",
            },
            "military_exercises": {
                "zh": "军事演习与训练",
                "en": "Military exercises and training",
            },
            "military_operations": {
                "zh": "军事行动与任务",
                "en": "Military operations and missions",
            },
            "intl_security_arms_control": {
                "zh": "国际安全与军控",
                "en": "International security and arms control",
            },
        },
    },

    # 11. 民生服务
    "livelihood_services": {
        "name_zh": "民生服务",
        "name_en": "Livelihood & Public Services",
        "sub": {
            "housing_property": {
                "zh": "住房与物业",
                "en": "Housing and property",
            },
            "transport_travel": {
                "zh": "交通出行",
                "en": "Transport and travel",
            },
            "public_utilities": {
                "zh": "水电气等公共服务",
                "en": "Public utilities",
            },
            "food_safety": {
                "zh": "食品安全",
                "en": "Food safety",
            },
            "consumer_rights": {
                "zh": "消费维权",
                "en": "Consumer rights",
            },
            "city_management": {
                "zh": "城市管理",
                "en": "City management",
            },
            "community_services": {
                "zh": "社区与基层服务",
                "en": "Community and grassroots services",
            },
        },
    },

    # 12. 观点评论
    "opinion_commentary": {
        "name_zh": "观点评论",
        "name_en": "Opinion & Commentary",
        "sub": {
            "editorials": {
                "zh": "社论与评论",
                "en": "Editorials and commentaries",
            },
            "columns": {
                "zh": "专栏与个人观点",
                "en": "Columns and personal opinions",
            },
            "in_depth_analysis": {
                "zh": "深度分析与解读",
                "en": "In-depth analysis",
            },
            "investigative_reports": {
                "zh": "调查报道",
                "en": "Investigative reports",
            },
            "data_journalism": {
                "zh": "数据新闻与可视化",
                "en": "Data journalism and visualization",
            },
            "reader_opinions": {
                "zh": "读者来信与互动",
                "en": "Reader opinions and interaction",
            },
        },
    },
}



def build_taxonomy_text():
    """
    把 NEWS_CATEGORY_SCHEMA 转成一段纯文本，塞进 prompt 用
    """
    lines = []
    lines.append("News taxonomy (for Chinese news platform):")
    lines.append("Top-level categories (level1_code) and their second-level codes (level2_codes):")
    for l1_code, meta in NEWS_CATEGORY_SCHEMA.items():
        lines.append(f"- {l1_code} ({meta['name_zh']}):")
        for l2_code, name_zh in meta["sub"].items():
            lines.append(f"  - {l2_code}: {name_zh}")
    return "\n".join(lines)


SUMMARY_OUTPUT_KEYS = ["title_zh", "summary_zh", "title_en", "summary_en"]


def build_summary_system_prompt():
    return """
你是中文新闻编辑，只负责把已清洗的新闻正文提纯成标题和摘要。

输出要求：
1. 只能输出 JSON。
2. 只能使用以下键名：
   ["title_zh", "summary_zh", "title_en", "summary_en"]
3. 中文标题必须自然、完整、新闻化，不能保留网页模板词、来源说明、栏目名或营销口号。
4. 中文摘要必须：
   - 基于正文事实
   - 单段完整句
   - 不超过 120 个汉字
   - 不能截断
   - 不能出现“相关阅读”“点击查看”“来源：”“原标题”“广告”“图/文”等模板词
5. 无论原始语言是中文、英文、西班牙语、日语、阿拉伯语或其他语言，title_zh 和 summary_zh 都必须是简体中文，不能保留原文长句。
6. title_en 和 summary_en 都必须是自然英文；如果原文不是英文，请翻译/改写为英文，不能留空，也不能保留西班牙语、日语、阿拉伯语等原文。
7. 不要生成标签、分类、评分、评论、解释或其他额外字段。
""".strip()


def build_summary_user_prompt(title, text, source_name="", source_language=""):
    return f"""
请根据下面的新闻信息输出精炼 JSON。

新闻来源：
{source_name}

原始语言：
{source_language}

原始标题：
{title}

新闻正文：
{text}
""".strip()


def build_prompt(title, text, source_name="", source_language=""):
    return f"{build_summary_system_prompt()}\n\n{build_summary_user_prompt(title, text, source_name=source_name, source_language=source_language)}"


if __name__ == '__main__':

    from keybert import KeyBERT
    title = "Sperm from donor with cancer-causing gene was used to conceive almost 200 children",
    text = """
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
    # a = build_prompt(title, text)
    kw_model = KeyBERT()
    keywords = kw_model.extract_keywords(text, keyphrase_ngram_range=(3, 4), stop_words='english',
                              use_mmr=True)
    print([i[0] for i in keywords])
