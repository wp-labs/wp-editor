const COMPLETION_LABELS = {
  'zh-CN': {
    description: '说明',
    example: '示例',
    packageDetail: '包定义',
    packageInfo: '定义 WPL 包路径与作用域。',
    ruleDetail: '规则定义',
    ruleInfo: '定义规则名称与规则体。',
  },
  'en-US': {
    description: 'Description',
    example: 'Example',
    packageDetail: 'Package',
    packageInfo: 'Define WPL package path and scope.',
    ruleDetail: 'Rule',
    ruleInfo: 'Define rule name and body.',
  },
};

export const getCompletionLabels = (lang) => COMPLETION_LABELS[lang] || COMPLETION_LABELS['zh-CN'];

export const buildCompletionInfo = (labels, description, example) => {
  const lines = [];
  if (description) lines.push(`${labels.description}：${description}`);
  if (example) lines.push(`${labels.example}：${example}`);
  return lines.length ? lines.join('\n') : undefined;
};
