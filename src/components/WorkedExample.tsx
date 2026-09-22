import { useState } from 'react';
import type { ExampleView } from '../lib/content/views';
import Runner from './Runner';

export default function WorkedExample({ example }: { example: ExampleView }) {
  const [shown, setShown] = useState(1);
  const total = example.steps.length;
  return (
    <div className="card worked" data-example-id={example.gid}>
      <h3>{example.title}</h3>
      <div className="prompt" dangerouslySetInnerHTML={{ __html: example.promptHtml }} />
      <ol className="steps">
        {example.steps.slice(0, shown).map((s, i) => (
          <li key={i}>
            <div dangerouslySetInnerHTML={{ __html: s.html }} />
            <Runner lang={example.lang} code={s.code} />
          </li>
        ))}
      </ol>
      {shown < total ? (
        <div className="runner-bar">
          <button type="button" className="primary" onClick={() => setShown(shown + 1)}>ขั้นต่อไป ({shown}/{total})</button>
          <button type="button" className="ghost" onClick={() => setShown(total)}>แสดงทุกขั้น</button>
        </div>
      ) : (
        example.pitfall && (
          <div className="pitfall">
            <p><strong>⚠ ทางที่คนมักพลาด</strong></p>
            <div dangerouslySetInnerHTML={{ __html: example.pitfall.html }} />
            {example.pitfall.code && <Runner lang={example.lang} code={example.pitfall.code} />}
          </div>
        )
      )}
    </div>
  );
}
