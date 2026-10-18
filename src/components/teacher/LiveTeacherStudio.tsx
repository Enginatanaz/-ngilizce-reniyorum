import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  Languages, 
  Sliders, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Globe,
  RotateCcw,
  Smile,
  GraduationCap,
  Zap,
  BookOpen,
  MessageSquareQuote
} from 'lucide-react';
import { TeacherLectureData } from '../../types/lesson';
import { 
  audioEngine, 
  AudioSegment, 
  AudioPlaybackState, 
  TeacherPersona,
  TEACHER_PERSONAS 
} from '../../services/audioEngine';
import { SpeechRate } from '../../utils/speech';

interface LiveTeacherStudioProps {
  lecture: TeacherLectureData;
}

export const LiveTeacherStudio: React.FC<LiveTeacherStudioProps> = ({ lecture }) => {
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>('idle');
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(-1);
  const [currentSegment, setCurrentSegment] = useState<AudioSegment | null>(null);
  const [segments, setSegments] = useState<AudioSegment[]>([]);
  const [speechRate, setSpeechRate] = useState<SpeechRate>(0.8);
  const [activePersona, setActivePersona] = useState<TeacherPersona>('warm');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState<boolean>(false);

  // Available voices
  const [voices, setVoices] = useState<{ enVoices: SpeechSynthesisVoice[]; trVoices: SpeechSynthesisVoice[] }>({
    enVoices: [],
    trVoices: [],
  });
  const [selectedEnURI, setSelectedEnURI] = useState<string>('');
  const [selectedTrURI, setSelectedTrURI] = useState<string>('');

  const activeSegmentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Generate conversational teacher narration script
    const generated = audioEngine.buildTeacherNarration(lecture, activePersona);
    setSegments(generated);
    setSpeechRate(audioEngine.getRate());

    const unsubState = audioEngine.subscribeState((st) => setPlaybackState(st));
    const unsubSegment = audioEngine.subscribeSegment((idx, seg) => {
      setCurrentSegmentIndex(idx);
      setCurrentSegment(seg);
    });

    const updateVoices = () => {
      setVoices(audioEngine.getAvailableVoices());
    };
    updateVoices();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      unsubState();
      unsubSegment();
      audioEngine.stop();
    };
  }, [lecture, activePersona]);

  // Scroll active segment into view when expanded
  useEffect(() => {
    if (activeSegmentRef.current && isExpanded) {
      activeSegmentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentSegmentIndex, isExpanded]);

  const handleTogglePlay = () => {
    if (playbackState === 'playing') {
      audioEngine.pause();
    } else if (playbackState === 'paused') {
      audioEngine.resume();
    } else {
      audioEngine.play(currentSegmentIndex >= 0 ? currentSegmentIndex : 0);
    }
  };

  const handleStop = () => {
    audioEngine.stop();
  };

  const handlePrev = () => {
    if (currentSegmentIndex > 0) {
      audioEngine.jumpToSegment(currentSegmentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentSegmentIndex < segments.length - 1) {
      audioEngine.jumpToSegment(currentSegmentIndex + 1);
    }
  };

  const handleReplayCurrent = () => {
    if (currentSegmentIndex >= 0) {
      audioEngine.jumpToSegment(currentSegmentIndex);
    }
  };

  const handleRateChange = (newRate: SpeechRate) => {
    setSpeechRate(newRate);
    audioEngine.setRate(newRate);
  };

  const handlePersonaChange = (persona: TeacherPersona) => {
    setActivePersona(persona);
    audioEngine.setPersona(persona);
  };

  const handleJumpTo = (index: number) => {
    audioEngine.jumpToSegment(index);
  };

  const handleEnVoiceChange = (uri: string) => {
    setSelectedEnURI(uri);
    audioEngine.setVoicePreferences(uri, selectedTrURI || undefined);
  };

  const handleTrVoiceChange = (uri: string) => {
    setSelectedTrURI(uri);
    audioEngine.setVoicePreferences(selectedEnURI || undefined, uri);
  };

  const personaConfig = TEACHER_PERSONAS[activePersona];
  const progressPercent =
    segments.length > 0 && currentSegmentIndex >= 0
      ? Math.round(((currentSegmentIndex + 1) / segments.length) * 100)
      : 0;

  return (
    <div className="rounded-3xl border border-indigo-200/90 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-xl overflow-hidden relative">
      {/* Decorative background aura */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Studio Bar */}
      <div className="relative z-10 p-5 sm:p-6 border-b border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Live Teacher Presence & Status */}
          <div className="flex items-center gap-4">
            {/* Animated Teacher Avatar */}
            <div className="relative shrink-0">
              <button
                onClick={handleTogglePlay}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
                  playbackState === 'playing'
                    ? 'bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 ring-4 ring-amber-400/30'
                    : 'bg-white text-indigo-950 hover:bg-indigo-50 ring-4 ring-white/10'
                }`}
                title={playbackState === 'playing' ? 'Durdur' : 'Canlı Öğretmen Anlatımını Başlat'}
              >
                {playbackState === 'playing' ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-1" />
                )}
              </button>

              {/* Pulsing broadcast beacon when playing */}
              {playbackState === 'playing' && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900" />
                </span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  <Languages className="w-3.5 h-3.5 text-amber-300" />
                  Birebir Öğretmen Anlatımı (Bilingual TTS)
                </span>

                {playbackState === 'playing' ? (
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    Öğretmeniniz Konuyu Anlatıyor...
                  </span>
                ) : playbackState === 'paused' ? (
                  <span className="text-[11px] font-bold text-amber-300">Duraklatıldı</span>
                ) : (
                  <span className="text-[11px] text-slate-400">Dinlemeye Hazır</span>
                )}
              </div>

              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-snug">
                Sanki Karşınızda Canlı Bir Öğretmen Varmış Gibi Dinleyin
              </h3>

              <p className="text-xs text-indigo-200/80 mt-0.5 max-w-xl">
                Türkçe açıklamalarla kuralın mantığını kavrayın, İngilizce formül ve örnekleri kusursuz anadili aksanıyla duyun.
              </p>
            </div>
          </div>

          {/* Right: Persona selector & playback controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Teacher Persona Selector */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => handlePersonaChange('warm')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activePersona === 'warm'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-indigo-200 hover:text-white'
                }`}
                title="Sıcak, cesaretlendirici ve sakin öğretmen tarzı"
              >
                <Smile className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Samimi</span>
              </button>

              <button
                onClick={() => handlePersonaChange('focused')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activePersona === 'focused'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-indigo-200 hover:text-white'
                }`}
                title="Metodik, net ve kural odaklı öğretmen tarzı"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Metodik</span>
              </button>

              <button
                onClick={() => handlePersonaChange('dynamic')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activePersona === 'dynamic'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-indigo-200 hover:text-white'
                }`}
                title="Pratik, canlı ve günlük konuşma koçu tarzı"
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pratik</span>
              </button>
            </div>

            {/* Quick Navigation Buttons */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/10">
                <button
                  onClick={handlePrev}
                  disabled={currentSegmentIndex <= 0}
                  className="p-2 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Önceki Cümle"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={handleStop}
                  disabled={playbackState === 'idle'}
                  className="p-2 text-slate-300 hover:text-rose-400 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Durdur"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentSegmentIndex >= segments.length - 1}
                  className="p-2 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Sonraki Cümle"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Speed Rate Toggles */}
              <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/10 text-xs font-bold">
                {(['0.8', '1.0', '1.2'] as const).map((rStr) => {
                  const r = parseFloat(rStr) as SpeechRate;
                  const isActive = speechRate === r;
                  return (
                    <button
                      key={rStr}
                      onClick={() => handleRateChange(r)}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : 'text-indigo-200 hover:text-white hover:bg-white/5'
                      }`}
                      title={`${rStr}x Konuşma Hızı`}
                    >
                      {rStr}x
                    </button>
                  );
                })}
              </div>

              {/* Voice Settings Gear */}
              <button
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  showVoiceSettings
                    ? 'bg-amber-400/20 border-amber-300 text-amber-300'
                    : 'bg-white/10 border-white/10 text-indigo-200 hover:text-white'
                }`}
                title="Ses Motoru Ayarları"
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar Timeline */}
        {segments.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-3 text-xs text-indigo-300">
            <span className="font-mono text-[11px] shrink-0">
              {currentSegmentIndex >= 0 ? currentSegmentIndex + 1 : 0} / {segments.length}
            </span>
            <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-bold text-[11px] shrink-0 text-amber-300">
              %{progressPercent}
            </span>
          </div>
        )}
      </div>

      {/* Voice Selection Settings Panel */}
      {showVoiceSettings && (
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-white/10 text-xs space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-amber-400" />
              Doğal Öğretmen Sesleri Seçimi
            </span>
            <span className="text-[11px] text-slate-400">
              {personaConfig.name} — {personaConfig.tagline}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* English Voice Selector */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <label className="block text-[11px] font-bold text-indigo-300 mb-1.5 flex items-center gap-1.5">
                <span>🇬🇧</span> İngilizce Ses (Formül & Örnek Cümleler)
              </label>
              <select
                value={selectedEnURI}
                onChange={(e) => handleEnVoiceChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-2 text-xs focus:ring-1 focus:ring-amber-400"
              >
                <option value="">Otomatik Seçim (En Doğal İngilizce Ses)</option>
                {voices.enVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Turkish Voice Selector */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <label className="block text-[11px] font-bold text-indigo-300 mb-1.5 flex items-center gap-1.5">
                <span>🇹🇷</span> Türkçe Ses (Öğretmen Açıklamaları & Kurallar)
              </label>
              <select
                value={selectedTrURI}
                onChange={(e) => handleTrVoiceChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-2 text-xs focus:ring-1 focus:ring-amber-400"
              >
                <option value="">Otomatik Seçim (En Doğal Türkçe Ses)</option>
                {voices.trVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Center Stage: The Live Conversational Chalkboard */}
      <div className="p-5 sm:p-7 bg-gradient-to-b from-indigo-950/80 to-slate-950/90 relative">
        {currentSegment ? (
          <div className="space-y-3 animate-fadeIn">
            {/* Section badge & language pill */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-300/30">
                  {currentSegment.section}
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${
                    currentSegment.lang === 'en'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  }`}
                >
                  {currentSegment.lang === 'en' ? '🇬🇧 İngilizce Telaffuz' : '🇹🇷 Türkçe Öğretmen Anlatımı'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReplayCurrent}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                  title="Bu cümleyi tekrar dinle"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tekrar Dinle</span>
                </button>
              </div>
            </div>

            {/* Live Spoken Sentence (Large Typography) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
              <p className="text-base sm:text-xl font-bold text-white leading-relaxed tracking-tight">
                "{currentSegment.text}"
              </p>

              {currentSegment.sourceContext && (
                <p className="text-xs sm:text-sm text-indigo-300 italic mt-2 border-t border-white/10 pt-2">
                  Türkçe Karşılığı: "{currentSegment.sourceContext}"
                </p>
              )}

              {currentSegment.teacherNote && (
                <div className="mt-3 flex items-start gap-2 text-xs text-amber-300/90 bg-amber-400/10 p-2.5 rounded-xl border border-amber-300/20">
                  <MessageSquareQuote className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>{currentSegment.teacherNote}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 text-amber-300 mx-auto flex items-center justify-center">
              <Volume2 className="w-6 h-6" />
            </div>
            <p className="text-sm sm:text-base font-semibold text-slate-200 max-w-lg mx-auto">
              Yukarıdaki <strong>Oynat</strong> butonuna basarak dersi sanki öğretmeniniz yanınızdaymış gibi baştan sona dinleyebilirsiniz.
            </p>
            <button
              onClick={handleTogglePlay}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Dersi Dinlemeye Başla</span>
            </button>
          </div>
        )}
      </div>

      {/* Interactive Script Explorer Drawer Toggle */}
      <div className="p-3 bg-slate-900 border-t border-white/10 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">
          Ders Akışı ({segments.length} Bölüm & Cümle)
        </span>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-indigo-200 font-semibold transition-colors cursor-pointer"
        >
          <span>{isExpanded ? 'Akış Listesini Gizle' : 'Tüm Cümleleri Gör & Seç'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Segment List */}
      {isExpanded && (
        <div className="p-4 bg-slate-950/95 border-t border-white/10 max-h-80 overflow-y-auto space-y-2 text-xs">
          {segments.map((seg, idx) => {
            const isSpeakingThis = currentSegmentIndex === idx && playbackState === 'playing';
            const isSelected = currentSegmentIndex === idx;

            return (
              <div
                key={seg.id}
                ref={isSelected ? activeSegmentRef : null}
                onClick={() => handleJumpTo(idx)}
                className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                  isSpeakingThis
                    ? 'bg-amber-400/20 border-amber-400 text-white shadow-sm ring-1 ring-amber-400/40'
                    : isSelected
                    ? 'bg-indigo-600/30 border-indigo-400 text-white'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        seg.lang === 'en'
                          ? 'bg-sky-500/30 text-sky-200'
                          : 'bg-emerald-500/30 text-emerald-200'
                      }`}
                    >
                      {seg.lang === 'en' ? 'EN' : 'TR'}
                    </span>
                    <span className="font-bold text-[11px] text-amber-300">{seg.section}</span>
                    {seg.label && <span className="text-[10px] text-slate-400">• {seg.label}</span>}
                  </div>

                  <p className="text-xs sm:text-sm font-medium leading-relaxed">
                    {seg.text}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isSpeakingThis ? (
                    <span className="flex items-center gap-0.5">
                      <span className="w-1 h-3 bg-amber-400 animate-pulse" />
                      <span className="w-1 h-5 bg-amber-400 animate-pulse delay-75" />
                      <span className="w-1 h-2 bg-amber-400 animate-pulse delay-150" />
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">
                      #{idx + 1}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
