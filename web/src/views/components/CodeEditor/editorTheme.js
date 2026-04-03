import { EditorView } from '@codemirror/view';

export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
  },
  '.cm-content': {
    fontFamily:
      '"Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '13px',
    lineHeight: '1.6',
    padding: '14px 16px',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '.cm-gutters': {
    minWidth: '48px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 12px 0 10px',
    textAlign: 'right',
  },
  '.cm-tooltip-autocomplete': {
    backgroundColor: '#0b1224',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.45)',
  },
  '.cm-tooltip-autocomplete .cm-completionList': {
    backgroundColor: 'transparent',
  },
  '.cm-tooltip-autocomplete ul li': {
    color: '#94a3b8',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  '.cm-tooltip-autocomplete ul li:hover, .cm-tooltip-autocomplete .cm-completionItem:hover': {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected], .cm-tooltip-autocomplete .cm-completionItem[aria-selected]': {
    backgroundColor: 'rgba(59, 130, 246, 0.3) !important',
    color: '#f8fafc !important',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected] .cm-completionMatchedText, .cm-tooltip-autocomplete .cm-completionItem[aria-selected] .cm-completionMatchedText': {
    color: '#80F4FF !important',
  },
  '.cm-tooltip-autocomplete .cm-completionMatchedText': {
    color: '#80F4FF',
  },
});
