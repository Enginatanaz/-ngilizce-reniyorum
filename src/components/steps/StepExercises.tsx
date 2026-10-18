import React, { useState } from 'react';
import { 
  HelpCircle, 
  Check, 
  X, 
  Lightbulb, 
  ArrowRight, 
  Award,
  RotateCcw,
  Sparkles,
  Volume2,
  Brain
} from 'lucide-react';
import { LessonData, ExerciseItem } from '../../types/lesson';
import { addMistake } from '../../services/srsEngine';
import { AudioButton } from '../common/AudioButton';
import { validateStudentAnswer, ValidationResult } from '../../utils/answerValidator';

interface StepExercisesProps {
  lesson: LessonData;
  exerciseAnswers: Record<string, { userAnswer: string; isCorrect: boolean }>;
  onRecordAnswer: (exerciseId: string, answer: string, isCorrect: boolean) => void;
  onContinue: () => void;
}

export const StepExercises: React.FC<StepExercisesProps> = ({
  lesson,
  exerciseAnswers,
  onRecordAnswer,
  onContinue,
}) => {
  const [fillInputs, setFillInputs] = useState<Record<string, string>>({});
  const [showHints, setShowHints] = useState<Record<string, boolean>>({});
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});

  const handleSelectOption = (exercise: ExerciseItem, option: string) => {
    // If already answered, don't re-select
    if (exerciseAnswers[exercise.id]) return;

    const val = validateStudentAnswer(option, exercise.correctAnswer);
    setValidationResults((prev) => ({ ...prev, [exercise.id]: val }));
    onRecordAnswer(exercise.id, option, val.isCorrect);

    if (!val.isCorrect) {
      addMistake({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonCode: lesson.code,
        level: lesson.level,
        exerciseId: exercise.id,
        prompt: exercise.prompt,
        sentence: exercise.sentence,
        userWrongAnswer: option,
        correctAnswer: exercise.correctAnswer,
        explanation: exercise.explanation,
      });
    }
  };

  const handleFillSubmit = (exercise: ExerciseItem) => {
    const userInput = fillInputs[exercise.id] || '';
    if (!userInput.trim()) return;

    const val = validateStudentAnswer(userInput.trim(), exercise.correctAnswer);
    setValidationResults((prev) => ({ ...prev, [exercise.id]: val }));
    onRecordAnswer(exercise.id, userInput.trim(), val.isCorrect);

    if (!val.isCorrect) {
      addMistake({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonCode: lesson.code,
        level: lesson.level,
        exerciseId: exercise.id,
        prompt: exercise.prompt,
        sentence: exercise.sentence,
        userWrongAnswer: userInput.trim(),
        correctAnswer: exercise.correctAnswer,
        explanation: exercise.explanation,
      });
    }
  };

  const handleRetry = (exerciseId: string) => {
    setFillInputs((prev) => ({ ...prev, [exerciseId]: '' }));
    setValidationResults((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
    onRecordAnswer(exerciseId, '', false);
  };

  const toggleHint = (id: string) => {
    setShowHints((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const answeredCount = Object.keys(exerciseAnswers).length;
  const correctCount = Object.values(exerciseAnswers).filter((a) => a.isCorrect).length;
  const allAnswered = answeredCount >= lesson.exercises.length;

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      {/* Header and Progress Badge */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-2">
              <HelpCircle className="w-4 h-4" />
              <span>Bölüm 4 — İnteraktif Alıştırmalar & Sesli Pratik</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Kavrama ve Uygulama Alıştırmaları
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Soruları çözün, telaffuzları dinleyin ve anında pedagojik geri bildirim alın.
            </p>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
            <span className="text-xs font-semibold text-slate-600">Durum:</span>
            <span className="text-sm font-bold text-indigo-600">{answeredCount} / {lesson.exercises.length}</span>
            {allAnswered && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {correctCount} Doğru
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Exercises List */}
      <div className="space-y-5">
        {lesson.exercises.map((exercise, index) => {
          const userState = exerciseAnswers[exercise.id];
          const hasAnswered = !!userState;
          const isCorrect = userState?.isCorrect;

          return (
            <div
              key={exercise.id}
              className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-xs transition-all ${
                hasAnswered
                  ? isCorrect
                    ? 'border-emerald-300 ring-1 ring-emerald-300/40'
                    : 'border-rose-300 ring-1 ring-rose-300/40'
                  : 'border-slate-200/90'
              }`}
            >
              {/* Question Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700">
                    Soru {index + 1}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    {exercise.type === 'multiple-choice' ? 'Çoktan Seçmeli' : 'Boşluk Doldurma'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {exercise.hint && !hasAnswered && (
                    <button
                      onClick={() => toggleHint(exercise.id)}
                      className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                      <span>{showHints[exercise.id] ? 'İpucunu Gizle' : 'İpucu Gör'}</span>
                    </button>
                  )}

                  {exercise.sentence && (
                    <AudioButton text={exercise.sentence} size="sm" showSpeedToggle />
                  )}
                </div>
              </div>

              {/* Prompt & Sentence */}
              <div className="mb-4">
                <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">
                  {exercise.prompt}
                </p>
                {exercise.sentence && (
                  <p className="text-base sm:text-lg font-bold text-slate-900 bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-sans">
                    {exercise.sentence}
                  </p>
                )}
              </div>

              {/* Hint Callout */}
              {showHints[exercise.id] && !hasAnswered && exercise.hint && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200/70 text-xs sm:text-sm text-amber-900 flex items-start gap-2 animate-fadeIn">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{exercise.hint}</span>
                </div>
              )}

              {/* Multiple Choice Options */}
              {exercise.type === 'multiple-choice' && exercise.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {exercise.options.map((opt, optIdx) => {
                    const isSelected = userState?.userAnswer === opt;
                    const isCorrectOpt = opt.toLowerCase() === exercise.correctAnswer.toLowerCase();

                    let btnClass = "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800";
                    if (hasAnswered) {
                      if (isCorrectOpt) {
                        btnClass = "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-2 ring-emerald-400/20";
                      } else if (isSelected && !isCorrectOpt) {
                        btnClass = "bg-rose-50 border-rose-300 text-rose-800 line-through";
                      } else {
                        btnClass = "bg-slate-50 border-slate-100 text-slate-400 opacity-60";
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        disabled={hasAnswered}
                        onClick={() => handleSelectOption(exercise, opt)}
                        className={`p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${btnClass}`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-md bg-white text-slate-700 text-xs font-bold flex items-center justify-center border border-slate-200/80">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </span>

                        {hasAnswered && isCorrectOpt && <Check className="w-4 h-4 text-emerald-600" />}
                        {hasAnswered && isSelected && !isCorrectOpt && <X className="w-4 h-4 text-rose-600" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Fill in the blank input */}
              {exercise.type === 'fill-blank' && (
                <div className="space-y-3">
                  {!hasAnswered ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Cevabınızı buraya yazın..."
                        value={fillInputs[exercise.id] || ''}
                        onChange={(e) => setFillInputs({ ...fillInputs, [exercise.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFillSubmit(exercise);
                        }}
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                      />
                      <button
                        onClick={() => handleFillSubmit(exercise)}
                        disabled={!fillInputs[exercise.id]?.trim()}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs sm:text-sm hover:bg-indigo-700 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        Cevapla
                      </button>
                    </div>
                  ) : (
                    <div className={`p-3.5 rounded-xl border text-sm flex items-center justify-between ${
                      isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}>
                      <div>
                        <span>Sizin Cevabınız: <strong>{userState.userAnswer}</strong></span>
                        {!isCorrect && (
                          <span className="ml-3 text-slate-600 font-semibold">(Doğru cevap: <em>{exercise.correctAnswer}</em>)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <AudioButton text={exercise.correctAnswer} size="sm" />
                        {isCorrect ? <Check className="w-5 h-5 text-emerald-600" /> : <X className="w-5 h-5 text-rose-600" />}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pedagogical Explanation and Retry option */}
              {hasAnswered && (
                <div className={`mt-4 p-4 rounded-xl text-xs sm:text-sm border animate-fadeIn ${
                  isCorrect
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/80 border-rose-200 text-rose-950'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="font-bold flex items-center gap-2">
                      {isCorrect ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Doğru Yanıt — Harika Çıkarım!</span>
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4 text-rose-600" />
                          <span>Hata Analizi (SRS Hata Bankasına Kaydedildi):</span>
                        </>
                      )}

                      {/* Nuanced badges for contractions / minor typos */}
                      {validationResults[exercise.id]?.feedbackCategory === 'contraction-variant' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-200 text-emerald-900">
                          Kısaltma Eşdeğeri Kabul Edildi
                        </span>
                      )}
                      {validationResults[exercise.id]?.feedbackCategory === 'minor-typo' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Küçük Yazım Hatası Hoşgörüldü
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isCorrect && (
                        <>
                          <AudioButton text={exercise.correctAnswer} size="sm" label="Doğrusunu Dinle" />
                          <button
                            onClick={() => handleRetry(exercise.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs transition-colors cursor-pointer"
                            title="Bu soruyu baştan dene"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Tekrar Dene</span>
                          </button>
                        </>
                      )}
                      {isCorrect && (
                        <AudioButton text={exercise.correctAnswer} size="sm" label="Telaffuzu Dinle" />
                      )}
                    </div>
                  </div>
                  <p className="leading-relaxed text-slate-700">{exercise.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action CTA */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={onContinue}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 active:scale-98 transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <span>Kendi Cümleni Kurma Laboratuvarına Geç</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
