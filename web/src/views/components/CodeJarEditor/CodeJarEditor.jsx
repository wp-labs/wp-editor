import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { CodeJar } from 'codejar';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-tomorrow.css';
import styles from './CodeJarEditor.module.css';

const highlight = (editor) => {
  const code = editor.textContent;
  editor.innerHTML = Prism.highlight(code, Prism.languages.javascript, 'javascript');
};

const CodeJarEditor = forwardRef((props, ref) => {
  const editorRef = useRef(null);
  const jarRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getValue: () => jarRef.current?.toString() || '',
    setValue: (value) => {
      if (jarRef.current) {
        jarRef.current.updateCode(value || '');
      }
    },
  }));

  useEffect(() => {
    if (!editorRef.current) return;

    const jar = CodeJar(editorRef.current, highlight);

    jar.updateCode(props.value || '');
    jar.onUpdate((code) => {
      props.onChange?.(code);
    });

    jarRef.current = jar;

    return () => {
      jar.destroy();
    };
  }, []);

  useEffect(() => {
    if (jarRef.current && props.value !== undefined) {
      try {
        const pos = jarRef.current.save();
        if (pos) {
          jarRef.current.updateCode(props.value || '');
          jarRef.current.restore(pos);
        } else {
          jarRef.current.updateCode(props.value || '');
        }
      } catch (e) {
        jarRef.current.updateCode(props.value || '');
      }
    }
  }, [props.value]);

  return (
    <div className={`${styles.editor} ${props.className || ''}`}>
      <div
        ref={editorRef}
        className={styles.code}
      />
    </div>
  );
});

export default CodeJarEditor;
