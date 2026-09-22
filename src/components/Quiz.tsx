import { useEffect, useState } from 'react';
import type { QuizView } from '../lib/content/views';
import { useProgress } from '../lib/progress/useProgress';

export default function Quiz({ lessonId, questions }: { lessonId: string; questions: QuizView[] }) {
  const store = useProgress();
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a !== null && questions[i].choices[a].correct).length;
  const finished = questions.length > 0 && answered === questions.length;
  const last = store?.quizScore(lessonId) ?? null;

  useEffect(() => {
    if (finished) store?.recordQuiz(lessonId, correct, questions.length);
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (qi: number, ci: number) => setAnswers((a) => a.map((x, i) => (i === qi ? ci : x)));

  return (
    <div className="quiz">
      {last && answered === 0 && <p className="muted">ครั้งล่าสุดได้ {last.correct}/{last.total}</p>}
      {questions.map((q, qi) => {
        const chosen = answers[qi];
        return (
          <fieldset key={q.gid} className="card quiz-q">
            <legend dangerouslySetInnerHTML={{ __html: `${qi + 1}. ${q.questionHtml}` }} />
            {q.choices.map((c, ci) => {
              const cls = chosen === null ? '' : c.correct ? 'right' : chosen === ci ? 'wrong' : '';
              return (
                <button key={ci} type="button" className={`choice ${cls}`} disabled={chosen !== null} onClick={() => choose(qi, ci)} dangerouslySetInnerHTML={{ __html: c.html }} />
              );
            })}
            {chosen !== null && <div className="why" dangerouslySetInnerHTML={{ __html: q.choices[chosen].whyHtml }} />}
          </fieldset>
        );
      })}
      {finished && (
        <p className="verdict pass">
          ได้ {correct}/{questions.length}{' '}
          <button type="button" className="ghost" onClick={() => setAnswers(questions.map(() => null))}>ทำใหม่</button>
        </p>
      )}
    </div>
  );
}
