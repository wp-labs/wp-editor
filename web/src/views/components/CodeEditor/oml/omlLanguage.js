import { snippetCompletion } from '@codemirror/autocomplete';
import OML_COMPLETION_TABLE_ZH from './omlCompletionTable';
import OML_COMPLETION_TABLE_EN from './omlCompletionTable.en';
import { buildCompletionInfo, getCompletionLabels } from '../completionLabels';

export const OML_COMPLETION_VALID_FOR = /[\w/:\[\]]+|\|/;

export const buildOmlCompletionOptions = (lang) => {
  const labels = getCompletionLabels(lang);
  const table = lang === 'en-US' ? OML_COMPLETION_TABLE_EN : OML_COMPLETION_TABLE_ZH;
  return table.map((item) => {
    const description = item.description;
    return snippetCompletion(item.insertText, {
      label: item.label,
      type: 'function',
      detail: description,
      info: buildCompletionInfo(labels, description, item.example),
    });
  });
};
