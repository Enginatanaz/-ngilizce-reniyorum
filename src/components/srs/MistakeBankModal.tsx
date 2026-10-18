import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Brain, 
  RotateCcw, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  BookOpen, 
  Trash2,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { MistakeRecord } from '../../types/srs';
import { getAllMistakes, recordMistakeReview, removeMistake, clearMasteredMistakes } from '../../services/srsEngine';
import { AudioButton } from '../common/AudioButton';
import { CEFRLevel } from '../../types/lesson';

interface MistakeBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToLesson: (lessonId: number) => void;
}

export const MistakeBankModal: React.FC<MistakeBankModalProps> = ({
  isOpen,
  onClose,
  onNavigateToLesson,
}) => {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [filterLevel, setFilterLevel] = useState<CEFRLevel | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'due' | 'mastered'>('ALL');
  const [quizItem, setQuizItem] = useState<MistakeRecord | null>(null);
  const [showQuizAnswer, setShowQuizAnswer] = useState(false);

  const reloadData = () => {
    setMistakes(getAllMistakes());
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
    }
  }, [isOpen]);

  const filteredMistakes = useMemo(() => {
    return mistakes.filter((m) => {
      const matchLevel = filterLevel === 'ALL' || m.level === filterLevel;
      const matchStatus = 
        filterStatus === 'ALL' 
          ? true 
          : filterStatus === 'due' 
          ? m.status === 'due' || (m.status === 'reviewed' && m.nextReviewDate <= Date.now())
          : m.status === 'mastered';
      return matchLevel && matchStatus;
    });
  }, [mistakes, filterLevel, filterStatus]);

  const dueCount = useMemo(() => {
    const now = Date.now();
    return mistakes.filter((m) => m.status === 'due' || (m.status === 'reviewed' && m.nextReviewDate <= now)).length;
  }, [mistakes]);

  const masteredCount = useMemo(() => {
    return mistakes.filter((m) => m.status === 'mastered').length;
  }, [mistakes]);

  if (!isOpen) return null;

  const startQuiz = (item: MistakeRecord) => {
    setQuizItem(item);
    setShowQuizAnswer(false);
  };

  const handleQuizResult = (wasCorrect: boolean) => {
    if (!quizItem) return;
    recordMistakeReview(quizItem.id, wasCorrect);
    reloadData();
    setShowQuizAnswer(false);
    setQuizItem(null);
  };

  const handleDelete = (id: string) => {
    removeMistake(id);
    reloadData();
  };

  const handleClearMastered = () => {
    clearMasteredMistakes();
    reloadData();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] z-10 overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-slate-50/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Hata Bankası & Aralıklı Tekrar (SRS)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  {mistakes.length} Kayıt
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Yanlış yapılan sorular hafıza algoritmalarıyla otomatik tekrar kuyruğuna alınır
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SRS Stats Summary Bar */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-amber-50/40 border-b border-amber-100/80 text-center">
          <div className="p-2 rounded-xl bg-white border border-amber-200/60">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Toplam Hata</span>
            <span className="text-base font-extrabold text-slate-800">{mistakes.length}</span>
          </div>

          <div className="p-2 rounded-xl bg-white border border-amber-200/60">
            <span className="text-[10px] font-bold text-amber-700 uppercase block">Tekrar Bekleyen</span>
            <span className="text-base font-extrabold text-amber-600">{dueCount}</span>
          </div>

          <div className="p-2 rounded-xl bg-white border border-emerald-200/60">
            <span className="text-[10px] font-bold text-emerald-700 uppercase block">Kazanılan (Mastered)</span>
            <span className="text-base font-extrabold text-emerald-600">{masteredCount}</span>
          </div>
        </div>

        {/* Filter controls */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
            {(['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterLevel === lvl
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {lvl === 'ALL' ? 'Tüm Seviyeler' : lvl}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filterStatus === 'ALL' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setFilterStatus('due')}
                className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filterStatus === 'due' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Tekrar Zamanı ({dueCount})
              </button>
              <button
                onClick={() => setFilterStatus('mastered')}
                className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filterStatus === 'mastered' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Öğrenildi ({masteredCount})
              </button>
            </div>

            {masteredCount > 0 && (
              <button
                onClick={handleClearMastered}
                className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors p-1"
                title="Öğrenilmiş hataları temizle"
              >
                Temizle
              </button>
            )}
          </div>
        </div>

        {/* Modal Body / Quiz Mode or Mistakes List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* QUIZ FLASHCARD OVERLAY */}
          {quizItem ? (
            <div className="bg-gradient-to-br from-indigo-50/80 via-white to-amber-50/50 rounded-2xl border-2 border-indigo-200 p-6 shadow-sm space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-800">
                  {quizItem.level} — {quizItem.lessonCode}: {quizItem.lessonTitle}
                </span>
                <button
                  onClick={() => setQuizItem(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Geri Dön ✕
                </button>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Soru / Yönerge:
                </p>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {quizItem.prompt}
                </h3>
              </div>

              {quizItem.sentence && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-base font-semibold text-slate-800 flex items-center justify-between gap-3">
                  <span>{quizItem.sentence}</span>
                  <AudioButton text={quizItem.sentence} size="sm" showSpeedToggle />
                </div>
              )}

              {!showQuizAnswer ? (
                <div className="pt-4 flex justify-center">
                  <button
                    onClick={() => setShowQuizAnswer(true)}
                    className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
                  >
                    Cevabı ve Kuralı Göster
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pt-2 border-t border-indigo-100 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                      <span className="text-[10px] font-bold text-rose-700 uppercase block">Önceki Yanlış Cevabınız</span>
                      <span className="text-sm font-semibold text-rose-900 line-through">{quizItem.userWrongAnswer}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase block">Doğru Cevap</span>
                        <span className="text-sm font-bold text-emerald-900">{quizItem.correctAnswer}</span>
                      </div>
                      <AudioButton text={quizItem.correctAnswer} size="sm" />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700">
                    <strong className="block text-slate-900 mb-0.5">Pedagojik İpucu:</strong>
                    {quizItem.explanation}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <span className="text-xs text-slate-500 font-medium">Bu soruyu şimdi hatırladınız mı?</span>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleQuizResult(false)}
                        className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs transition-colors cursor-pointer"
                      >
                        ✕ Hatırlayamadım (Yeniden Tekrarla)
                      </button>
                      <button
                        onClick={() => handleQuizResult(true)}
                        className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs transition-colors shadow-xs cursor-pointer"
                      >
                        ✓ Hatırladım (+Aralıklı Tekrar Aralığı)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* LIST OF RECORDED MISTAKES */}
          {filteredMistakes.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Harika! Bu filtrede kayıtlı hata bulunmuyor.
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
                Alıştırmalarda veya anlama kontrollerinde yapacağınız yanlışlar burada toplanarak Spaced Repetition (SRS) ile pekiştirilecektir.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMistakes.map((item) => {
                const isDue = item.status === 'due' || (item.status === 'reviewed' && item.nextReviewDate <= Date.now());
                const isMastered = item.status === 'mastered';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isMastered
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : isDue
                        ? 'bg-amber-50/50 border-amber-200 shadow-2xs'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {item.level}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {item.lessonCode} — {item.lessonTitle}
                        </span>
                        {isDue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Tekrar Zamanı
                          </span>
                        )}
                        {isMastered && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            ✓ Kazanıldı
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => {
                            onClose();
                            onNavigateToLesson(item.lessonId);
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                          title="Derse Git"
                        >
                          <span>Derse Git</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Kayıttan Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-slate-800 mb-2">
                      {item.prompt}
                    </p>

                    {item.sentence && (
                      <div className="mb-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-xs font-medium text-slate-700 flex items-center justify-between">
                        <span>{item.sentence}</span>
                        <AudioButton text={item.sentence} size="sm" />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                      <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-100 text-rose-900">
                        <span className="font-bold text-[10px] text-rose-700 block">Sizin Cevabınız:</span>
                        <span className="line-through">{item.userWrongAnswer}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100 text-emerald-900 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[10px] text-emerald-700 block">Doğru Cevap:</span>
                          <span className="font-bold">{item.correctAnswer}</span>
                        </div>
                        <AudioButton text={item.correctAnswer} size="sm" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <span className="text-[11px] text-slate-500">
                        Tekrar Sayısı: <strong>{item.reviewCount}</strong> | Aralık: <strong>{item.intervalDays} gün</strong>
                      </span>

                      <button
                        onClick={() => startQuiz(item)}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                      >
                        Kendini Sına
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Spaced Repetition (SRS) aralıklı tekrar algoritması hafıza eğrisine göre çalışır.</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
