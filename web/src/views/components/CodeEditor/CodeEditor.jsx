import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { useTranslation } from 'react-i18next';
import styles from './CodeEditor.module.css';
import { editorTheme } from './editorTheme';
import {
  buildWplCompletionOptions,
  WPL_COMPLETION_VALID_FOR,
} from './wpl/wplLanguage';
import { wplHighlightExtension } from './wpl/wplTreeSitterHighlight';
import {
  buildOmlCompletionOptions,
  OML_COMPLETION_VALID_FOR,
} from './oml/omlLanguage';
import { omlHighlightExtension } from './oml/omlTreeSitterHighlight';

const createCompletionSource = (options, validFor) => (context) => {
  const word = context.matchBefore(validFor);
  const pipe = context.matchBefore(/\|/);
  if (!word && !pipe && !context.explicit) {
    return null;
  }
  const from = (pipe || word)?.from ?? context.pos;
  return {
    from,
    options,
    validFor,
  };
};

function CodeEditor(props, ref) {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const language = props.language || 'plain';
  const textColor = props.textColor;
  const theme = props.theme; // 可选的主题属性
  const { i18n } = useTranslation();
  const uiLanguage = i18n.language;
  const wplCompletionOptions = useMemo(() => buildWplCompletionOptions(uiLanguage), [uiLanguage]);
  const omlCompletionOptions = useMemo(() => buildOmlCompletionOptions(uiLanguage), [uiLanguage]);
  const wplCompletionSource = useMemo(
    () => createCompletionSource(wplCompletionOptions, WPL_COMPLETION_VALID_FOR),
    [wplCompletionOptions],
  );
  const omlCompletionSource = useMemo(
    () => createCompletionSource(omlCompletionOptions, OML_COMPLETION_VALID_FOR),
    [omlCompletionOptions],
  );
  const colorTheme = useMemo(() => {
    if (!textColor) return null;
    return EditorView.theme({
      '&': {
        color: textColor,
      },
      '.cm-content': {
        color: textColor,
      },
    });
  }, [textColor]);

  useImperativeHandle(ref, () => ({
    getValue: () => viewRef.current?.state.doc.toString() || '',
    setValue: (value) => {
      const view = viewRef.current;
      if (!view) return;
      const nextValue = value || '';
      const currentValue = view.state.doc.toString();
      if (currentValue !== nextValue) {
        view.dispatch({
          changes: { from: 0, to: currentValue.length, insert: nextValue },
        });
      }
    },
  }));

  useEffect(() => {
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        props.onChange?.(update.state.doc.toString());
      }
    });

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      EditorView.lineWrapping,
      EditorState.tabSize.of(2),
      history(),
      closeBrackets(),
      keymap.of([
        ...completionKeymap,
        ...closeBracketsKeymap,
        indentWithTab,
        ...historyKeymap,
        ...defaultKeymap,
      ]),
      editorTheme,
      ...(colorTheme ? [colorTheme] : []),
      updateListener,
    ];

    // 添加主题：默认使用 vscodeDark
    if (theme === 'vscodeDark' || !theme) {
      extensions.push(vscodeDark);
    } else {
      extensions.push(oneDark);
    }

    if (language === 'wpl') {
      extensions.splice(
        6,
        0,
        wplHighlightExtension(),
        autocompletion({ override: [wplCompletionSource] }),
      );
    }
    if (language === 'oml') {
      extensions.splice(
        6,
        0,
        omlHighlightExtension(),
        autocompletion({ override: [omlCompletionSource] }),
      );
    }
    if (language === 'json') {
      extensions.splice(6, 0, json());
    }

    const state = EditorState.create({
      doc: props.value || '',
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, uiLanguage, wplCompletionSource, omlCompletionSource, colorTheme, theme]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || props.value === undefined) return;
    const nextValue = props.value || '';
    const currentValue = view.state.doc.toString();
    if (currentValue !== nextValue) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: nextValue },
      });
    }
  }, [props.value]);

  return (
    <div className={`${styles.editor} ${props.className || ''}`}>
      <div ref={editorRef} className={styles.code} />
    </div>
  );
}

export default forwardRef(CodeEditor);
