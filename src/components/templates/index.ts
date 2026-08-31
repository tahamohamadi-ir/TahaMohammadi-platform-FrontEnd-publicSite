export const templateNames = [
  'HomeTemplate',
  'CollectionIndexTemplate',
  'EditorialIndexTemplate',
  'LongFormDetailTemplate',
  'EvidenceVisualDetailTemplate',
  'AboutContactUtilityTemplate',
] as const;

export type TemplateName = (typeof templateNames)[number];
