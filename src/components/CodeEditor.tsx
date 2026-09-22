import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { useMemo, useRef } from 'react';
import type { Lang } from '../lib/kinds';
import { useIsDark } from '../lib/useIsDark';

interface Props {
  lang: Lang;
  value: string;
  label: string;
  onChange?: (value: string) => void;
  onRun?: () => void;
  readOnly?: boolean;
}

export default function CodeEditor({ lang, value, label, onChange, onRun, readOnly = false }: Props) {
  const runRef = useRef(onRun);
  runRef.current = onRun;
  const dark = useIsDark();
  const extensions = useMemo(
    () => [
      lang === 'sql' ? sql({ dialect: PostgreSQL, upperCaseKeywords: true }) : python(),
      Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => { runRef.current?.(); return true; } }])),
    ],
    [lang],
  );
  return (
    <CodeMirror
      className="editor"
      value={value}
      onChange={onChange}
      extensions={extensions}
      editable={!readOnly}
      readOnly={readOnly}
      theme={dark ? 'dark' : 'light'}
      basicSetup={{ foldGutter: false, highlightActiveLine: !readOnly }}
      aria-label={label}
    />
  );
}
