import type { NewsDataItem } from './model';

const formatDate = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

export const newsDataMock: NewsDataItem[] = [
  {
    id: '1',
    headline: 'AI',
    tags: ['科技新闻', '大模型'],
    uploadDate: formatDate(0),
    description: '多模型协同编排进入实用阶段，企业部署成本持续下降。',
    detail: '该数据条目收录了多模型协同编排在企业场景中的最新实践，覆盖调度策略、推理成本和稳定性评估。',
    downloads: 2450,
    views: 8220,
  },
  {
    id: '2',
    headline: '早餐制作',
    tags: ['健康类', '生活方式'],
    uploadDate: formatDate(0),
    description: '智能厨房设备新品发布，早餐自动化流程可视化。',
    detail: '该条目包含早餐设备新品参数、自动化流程示意和用户评价样本，适合内容和产品运营做趋势参考。',
    downloads: 1660,
    views: 5390,
  },
  {
    id: '3',
    headline: 'Claude',
    tags: ['科技新闻', '产品更新'],
    uploadDate: formatDate(1),
    description: '开发者 API 文档更新，新增企业权限与审计能力。',
    detail: '数据详情包括版本变更点、权限边界说明以及企业审计日志字段定义，便于研发与合规团队对齐。',
    downloads: 2300,
    views: 7650,
  },
  {
    id: '4',
    headline: '美股开盘观察',
    tags: ['财经', '国际'],
    uploadDate: formatDate(2),
    description: '科技板块波动扩大，AI 概念股交易量明显上升。',
    detail: '本条目归档了开盘后 2 小时主要指数和 AI 概念股交易量变化，可用于金融新闻跟踪分析。',
    downloads: 1980,
    views: 6240,
  },
  {
    id: '5',
    headline: '医疗影像识别',
    tags: ['健康类', '科技新闻'],
    uploadDate: formatDate(4),
    description: '多中心测试结果发布，误诊率进一步下降。',
    detail: '条目内容涵盖医学影像模型在多中心测试中的表现，含指标定义、样本规模和场景覆盖范围。',
    downloads: 1290,
    views: 4310,
  },
  {
    id: '6',
    headline: '新能源电池',
    tags: ['产业', '科技新闻'],
    uploadDate: formatDate(9),
    description: '固态电池量产节奏推进，供应链价格波动收敛。',
    detail: '该数据条目跟踪固态电池产业链关键公司动向，包含出货预期、材料价格与政策信号。',
    downloads: 1540,
    views: 5120,
  },
  {
    id: '7',
    headline: '宏观政策速递',
    tags: ['财经', '政策'],
    uploadDate: formatDate(15),
    description: '重点行业扶持政策出炉，市场预期改善。',
    detail: '此条目总结了近期宏观政策文件核心变化，并提供行业影响路径与可跟踪指标。',
    downloads: 1770,
    views: 5830,
  },
  {
    id: '8',
    headline: '自动驾驶路测',
    tags: ['科技新闻', '汽车'],
    uploadDate: formatDate(27),
    description: '城市复杂路况测试扩大，数据采集维度更完整。',
    detail: '该条目记录自动驾驶城市路测阶段的关键里程碑，包括路况复杂度、事故率和场景覆盖率。',
    downloads: 1430,
    views: 4950,
  },
];
