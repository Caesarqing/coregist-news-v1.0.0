export type AgentType =
  | 'search'
  | 'preprocessing'
  | 'summarization'
  | 'bias_detection'
  | 'evaluation'
  | 'review'
  | 'scheduler'
  | 'notification';

export interface AgentConfigDto {
  id: string;
  name: string;
  description: string;
  agent_type: AgentType;
  llm_config: Record<string, unknown>;
  prompt_template: string;
  available_skills: string[];
  metadata: Record<string, unknown>;
}
