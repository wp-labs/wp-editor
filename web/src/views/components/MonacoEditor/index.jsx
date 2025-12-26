import './monaco-workers';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import styles from './Editor.module.css';

// 配置 Monaco Editor 使用本地资源而非 CDN
loader.config({ monaco });

const MonacoEditor = forwardRef((props, ref) => {
  const editorRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getValue: () => {
      return editorRef.current?.getValue() || '';
    },
    setValue: (value) => {
      editorRef.current?.setValue(value);
    },
  }));

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;

    editor.addCommand(monaco.KeyCode.Tab, () => {
      editor.trigger('keyboard', 'type', { text: '\t' });
    });
  };

  return (
    <div className={`${styles.Editor} ${props.className || ''}`}>
      <Editor
        {...props}
        className={undefined}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          ...props.options,
          folding: true,
          showFoldingControls: 'always',
          foldingHighlight: true,
          foldingStrategy: 'indentation',
          fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
        }}
      />
    </div>
  );
});

export default MonacoEditor;
