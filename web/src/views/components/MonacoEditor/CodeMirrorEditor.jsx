import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { defaultHighlightStyle, syntaxHighlighting, bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import styles from './Editor.module.css';

const CodeMirrorEditor = forwardRef((props, ref) => {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    getValue: () => viewRef.current?.state.doc.toString() || '',
    setValue: (value) => {
      if (viewRef.current) {
        viewRef.current.dispatch({
          changes: { from: 0, to: viewRef.current.state.doc.length, insert: value }
        });
      }
    },
  }));

  useEffect(() => {
    if (!editorRef.current) return;

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      foldGutter(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
      ]),
      javascript(),
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && props.onChange) {
          props.onChange(update.state.doc.toString());
        }
      }),
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '14px',
        },
        '.cm-scroller': {
          overflow: 'auto',
        },
        '.cm-gutters': {
          backgroundColor: 'transparent',
        },
      }),
    ];

    const state = EditorState.create({
      doc: props.value || '',
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;
    setLoading(false);

    return () => {
      view.destroy();
    };
  }, []);

  useEffect(() => {
    if (viewRef.current && props.value !== undefined) {
      const currentValue = viewRef.current.state.doc.toString();
      if (props.value !== currentValue) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentValue.length, insert: props.value }
        });
      }
    }
  }, [props.value]);

  if (loading) {
    return <div style={{ color: '#fff', padding: 20 }}>加载编辑器中...</div>;
  }

  return (
    <div className={`${styles.Editor} ${props.className || ''}`}>
      <div ref={editorRef} className={styles.codemirror} />
    </div>
  );
});

export default CodeMirrorEditor;
