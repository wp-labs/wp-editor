import { snippetCompletion } from '@codemirror/autocomplete';
import WPL_COMPLETION_TABLE_ZH from './wplCompletionTable';
import WPL_COMPLETION_TABLE_EN from './wplCompletionTable.en';
import { buildCompletionInfo, getCompletionLabels } from '../completionLabels';

export const WPL_COMPLETION_VALID_FOR = /[\w/]+|\|/;

export const buildWplCompletionOptions = (lang) => {
  const labels = getCompletionLabels(lang);
  const table = lang === 'en-US' ? WPL_COMPLETION_TABLE_EN : WPL_COMPLETION_TABLE_ZH;
  return [
    snippetCompletion(['package /${path}/ {', '}'].join('\n'), {
      label: 'package',
      type: 'keyword',
      detail: labels.packageDetail,
      info: labels.packageInfo,
    }),
    snippetCompletion(['rule ${name} {(', ')}'].join('\n'), {
      label: 'rule',
      type: 'keyword',
      detail: labels.ruleDetail,
      info: labels.ruleInfo,
    }),
    ...table.map((item) => {
      const description = item.description;
      return snippetCompletion(item.insertText, {
        label: item.label,
        type: item.kind,
        detail: description,
        info: buildCompletionInfo(labels, description, item.example),
      });
    }),
  ];
};
