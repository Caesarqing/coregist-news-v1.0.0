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


__all__ = ["NEWS_CATEGORY_SCHEMA", "build_taxonomy_text"]
