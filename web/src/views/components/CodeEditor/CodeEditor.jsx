import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentLess, insertTab } from '@codemirror/commands';
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
  createBundleCompletionSource,
} from './treeSitter/completionSource';
import { createTreeSitterHighlightExtension } from './treeSitter/highlightExtension';

function CodeEditor(props, ref) {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const language = props.language || 'plain';
  const textColor = props.textColor;
  const theme = props.theme; // 可选的主题属性
  const { i18n, t } = useTranslation();
  const uiLanguage = i18n.language;
  const showQuickPaste = props.showQuickPaste !== false;
  const wplCompletionSource = useMemo(
    () => createBundleCompletionSource('wpl', uiLanguage),
    [uiLanguage],
  );
  const omlCompletionSource = useMemo(
    () => createBundleCompletionSource('oml', uiLanguage),
    [uiLanguage],
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
  // Tab 行为：无选区时在光标处插入制表符；有选区时保持整体缩进能力，Shift-Tab 反缩进。
  const tabKeyBinding = useMemo(
    () => ({ key: 'Tab', run: insertTab, shift: indentLess }),
    [],
  );
  const replaceEditorContent = useCallback((nextValue) => {
    const view = viewRef.current;
    if (!view) return;
    const safeValue = nextValue || '';
    const currentValue = view.state.doc.toString();
    if (currentValue !== safeValue) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: safeValue },
      });
    }
  }, []);
  const handleQuickPaste = useCallback(async () => {
    if (!navigator?.clipboard?.readText) {
      props.onQuickPasteError?.(new Error('clipboard_api_not_supported'));
      return;
    }
    try {
      // 浏览器会返回剪贴板中的首个可读文本内容。
      const text = await navigator.clipboard.readText();
      replaceEditorContent(text);
      props.onQuickPaste?.(text);
    } catch (error) {
      props.onQuickPasteError?.(error);
    }
  }, [props, replaceEditorContent]);
  const handleQuickCopy = useCallback(async () => {
    if (!navigator?.clipboard?.writeText) {
      props.onQuickCopyError?.(new Error('clipboard_api_not_supported'));
      return;
    }
    try {
      const text = viewRef.current?.state.doc.toString() || '';
      await navigator.clipboard.writeText(text);
      props.onQuickCopy?.(text);
    } catch (error) {
      props.onQuickCopyError?.(error);
    }
  }, [props]);

  useImperativeHandle(ref, () => ({
    getValue: () => viewRef.current?.state.doc.toString() || '',
    setValue: value => replaceEditorContent(value),
    copyToClipboard: handleQuickCopy,
    pasteFromClipboard: handleQuickPaste,
  }), [handleQuickCopy, handleQuickPaste, replaceEditorContent]);

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
      EditorState.tabSize.of(4),
      history(),
      closeBrackets(),
      keymap.of([
        ...completionKeymap,
        ...closeBracketsKeymap,
        tabKeyBinding,
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
        createTreeSitterHighlightExtension('wpl'),
        autocompletion({ override: [wplCompletionSource] }),
      );
    }
    if (language === 'oml') {
      extensions.splice(
        6,
        0,
        createTreeSitterHighlightExtension('oml'),
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
  }, [language, uiLanguage, wplCompletionSource, omlCompletionSource, colorTheme, theme, tabKeyBinding]);

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
      {showQuickPaste && (
        <div className={styles.editorActions}>
          <button
            type="button"
            className={`${styles.quickActionBtn} ${styles.quickCopyBtn}`}
            onClick={handleQuickCopy}
            title={t('codeEditor.quickCopy', { defaultValue: '复制' })}
          >
            {t('codeEditor.quickCopy', { defaultValue: '复制' })}
          </button>
          <button
            type="button"
            className={`${styles.quickActionBtn} ${styles.quickPasteBtn}`}
            onClick={handleQuickPaste}
            title={t('codeEditor.quickPaste', { defaultValue: '粘贴' })}
          >
            {t('codeEditor.quickPaste', { defaultValue: '粘贴' })}
          </button>
        </div>
      )}
      <div ref={editorRef} className={styles.code} />
    </div>
  );
}

export default forwardRef(CodeEditor);
