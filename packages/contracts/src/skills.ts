export interface SkillConfigDto {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  returns: Record<string, unknown>;
  metadata: Record<string, unknown>;
}
