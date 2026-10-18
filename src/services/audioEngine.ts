/**
 * Natural Bilingual Audio & Conversational Teacher Engine
 * Uses Web Speech API with automatic Turkish/English code-switching,
 * language-based text segmentation, natural pauses, and human-like teacher delivery.
 */

import { TeacherLectureData, LectureBreakdownStep, CommonMistakeItem } from '../types/lesson';
import { SpeechRate, getSavedSpeechRate, saveSpeechRate } from '../utils/speech';

export type LanguageCode = 'en' | 'tr';
export type AudioPlaybackState = 'idle' | 'playing' | 'paused';
export type TeacherPersona = 'warm' | 'focused' | 'dynamic';

export interface AudioSegment {
  id: string;
  text: string;
  lang: LanguageCode;
  section: string;
  label?: string;
  teacherNote?: string;
  sourceContext?: string;
}

export interface TeacherPersonaConfig {
  id: TeacherPersona;
  name: string;
  tagline: string;
  pitch: number;
  pauseBetweenSegmentsMs: number;
  encouragingLeadIn: string;
}

export const TEACHER_PERSONAS: Record<TeacherPersona, TeacherPersonaConfig> = {
  warm: {
    id: 'warm',
    name: 'Sıcak & Samimi Öğretmen',
    tagline: 'Sanki karşında birebir oturan, sakin, cesaretlendirici ve anlaşılır öğretmen',
    pitch: 1.02,
    pauseBetweenSegmentsMs: 380,
    encouragingLeadIn: 'Harika gidiyoruz, şimdi dikkatle dinle!',
  },
  focused: {
    id: 'focused',
    name: 'Metodik & Net Öğretmen',
    tagline: 'Kavramın mantığına, kurallarına ve net örneklere odaklanan öğretmen',
    pitch: 0.98,
    pauseBetweenSegmentsMs: 320,
    encouragingLeadIn: 'Şimdi kuralın temel mekanizmasını görelim.',
  },
  dynamic: {
    id: 'dynamic',
    name: 'Pratik Konuşma Koçu',
    tagline: 'Canlı, ritmik ve günlük hayatta akıcı konuşmaya odaklanan anlatım',
    pitch: 1.05,
    pauseBetweenSegmentsMs: 250,
    encouragingLeadIn: 'Hadi gel bunu günlük hayatta nasıl söylediğimize bakalım!',
  },
};

class NaturalBilingualAudioEngine {
  private segments: AudioSegment[] = [];
  private currentSegmentIndex: number = -1;
  private playbackState: AudioPlaybackState = 'idle';
  private rate: SpeechRate = 0.8;
  private activePersona: TeacherPersona = 'warm';

  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private singleUtterance: SpeechSynthesisUtterance | null = null;

  private selectedEnVoiceURI: string | null = null;
  private selectedTrVoiceURI: string | null = null;

  private stateListeners: Array<(state: AudioPlaybackState) => void> = [];
  private segmentListeners: Array<(index: number, segment: AudioSegment | null) => void> = [];
  private progressListeners: Array<(current: number, total: number) => void> = [];

  constructor() {
    this.rate = getSavedSpeechRate();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Trigger voice detection
      };
    }
  }

  // --- Subscriptions ---
  public subscribeState(listener: (state: AudioPlaybackState) => void): () => void {
    this.stateListeners.push(listener);
    listener(this.playbackState);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  public subscribeSegment(listener: (index: number, segment: AudioSegment | null) => void): () => void {
    this.segmentListeners.push(listener);
    const curr = this.currentSegmentIndex >= 0 ? this.segments[this.currentSegmentIndex] : null;
    listener(this.currentSegmentIndex, curr);
    return () => {
      this.segmentListeners = this.segmentListeners.filter((l) => l !== listener);
    };
  }

  public subscribeProgress(listener: (current: number, total: number) => void): () => void {
    this.progressListeners.push(listener);
    listener(this.currentSegmentIndex + 1, this.segments.length);
    return () => {
      this.progressListeners = this.progressListeners.filter((l) => l !== listener);
    };
  }

  private notifyState(state: AudioPlaybackState) {
    this.playbackState = state;
    this.stateListeners.forEach((l) => l(state));
  }

  private notifySegment(index: number) {
    this.currentSegmentIndex = index;
    const seg = index >= 0 && index < this.segments.length ? this.segments[index] : null;
    this.segmentListeners.forEach((l) => l(index, seg));
    this.progressListeners.forEach((l) => l(index >= 0 ? index + 1 : 0, this.segments.length));
  }

  // --- Configuration ---
  public setRate(rate: SpeechRate) {
    this.rate = rate;
    saveSpeechRate(rate);
    if (this.playbackState === 'playing' && this.currentSegmentIndex >= 0) {
      const idx = this.currentSegmentIndex;
      this.stop();
      this.playSegmentAtIndex(idx);
    }
  }

  public getRate(): SpeechRate {
    return this.rate;
  }

  public setPersona(persona: TeacherPersona) {
    this.activePersona = persona;
  }

  public getPersona(): TeacherPersona {
    return this.activePersona;
  }

  public getState(): AudioPlaybackState {
    return this.playbackState;
  }

  public getCurrentIndex(): number {
    return this.currentSegmentIndex;
  }

  public getSegments(): AudioSegment[] {
    return this.segments;
  }

  public getAvailableVoices(): { enVoices: SpeechSynthesisVoice[]; trVoices: SpeechSynthesisVoice[] } {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return { enVoices: [], trVoices: [] };
    }
    const all = window.speechSynthesis.getVoices();
    const enVoices = all.filter((v) => v.lang.startsWith('en'));
    const trVoices = all.filter((v) => v.lang.startsWith('tr'));
    return { enVoices, trVoices };
  }

  public setVoicePreferences(enVoiceURI?: string, trVoiceURI?: string) {
    if (enVoiceURI) this.selectedEnVoiceURI = enVoiceURI;
    if (trVoiceURI) this.selectedTrVoiceURI = trVoiceURI;
  }

  // --- Natural Text Segmentation & Language Detection ---
  /**
   * Automatically detects whether a phrase/sentence is primarily English or Turkish.
   */
  public detectLanguage(text: string): LanguageCode {
    const clean = text.trim();
    if (!clean) return 'tr';

    // Turkish specific characters
    const turkishCharRegex = /[çğıöşüÇĞİÖŞÜ]/;
    if (turkishCharRegex.test(clean)) {
      return 'tr';
    }

    // Common Turkish grammatical words / markers
    const turkishMarkerRegex = /\b(ve|veya|için|ile|bir|bu|şu|o|ama|fakat|çünkü|nasıl|neden|burada|şurada|demek|kural|örnek|doğru|yanlış|yani|böyle|gibi|kadar|olarak)\b/i;
    if (turkishMarkerRegex.test(clean)) {
      return 'tr';
    }

    // Common English marker words
    const englishMarkerRegex = /\b(the|is|are|was|were|have|has|had|will|would|can|could|should|do|does|did|not|and|or|in|on|at|to|for|with|from|you|we|they|he|she|it|that|this)\b/i;
    if (englishMarkerRegex.test(clean)) {
      return 'en';
    }

    // Default to en if mostly ascii English letters
    return 'en';
  }

  /**
   * Splits mixed text into bilingual segments
   */
  public segmentMixedText(rawText: string, defaultSection: string = 'Açıklama'): AudioSegment[] {
    const segments: AudioSegment[] = [];
    let segId = 1;

    // Split on quotes or backticks to extract embedded English examples
    // E.g.: "Şimdi şu örneğe bakalım: 'I have seen this movie.' Burada have kullanımı..."
    const parts = rawText.split(/(["'`][^"'`]+["'`])/g);

    for (const part of parts) {
      const trimmed = part.replace(/^["'`]|["'`]$/g, '').trim();
      if (!trimmed) continue;

      const lang = this.detectLanguage(trimmed);
      segments.push({
        id: `seg-${segId++}`,
        section: defaultSection,
        text: trimmed,
        lang,
        label: lang === 'en' ? 'İngilizce Örnek' : 'Türkçe Anlatım',
      });
    }

    return segments;
  }

  /**
   * Cleans text for speech output (removes markdown, brackets, urls, arrows)
   */
  public sanitizeTextForTTS(text: string): string {
    return text
      .replace(/[*_#`[\]()]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[→▶•—–]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // --- Human-Like Teacher Conversational Script Generator ---
  /**
   * Generates a warm, authentic 1-on-1 teacher lesson script from TeacherLectureData
   */
  public buildTeacherNarration(
    lecture: TeacherLectureData,
    personaType: TeacherPersona = this.activePersona
  ): AudioSegment[] {
    this.stop();
    const segments: AudioSegment[] = [];
    let idCounter = 1;

    const persona = TEACHER_PERSONAS[personaType];

    // 1. Warm Teacher Greeting & Hook
    const introGreeting =
      personaType === 'warm'
        ? `Merhaba! Hoş geldin. Bugün seninle harika bir konu çalışıyoruz: ${lecture.coreConcept.title}. Hiç endişelenme, adım adım çok rahat öğreneceksin.`
        : personaType === 'dynamic'
        ? `Selam! Bugün pratik konuşmada çok işine yarayacak ${lecture.coreConcept.title} konusuna dalıyoruz. Hazırsan başlayalım!`
        : `Hoş geldiniz. Bu dersimizde ${lecture.coreConcept.title} konusunu pedagojik temelleriyle inceleyeceğiz.`;

    segments.push({
      id: `ts-${idCounter++}`,
      section: 'Öğretmen Girişi',
      text: introGreeting,
      lang: 'tr',
      label: 'Giriş & Karşılama',
      teacherNote: 'Öğretmeniniz derse samimi bir karşılama ile başlıyor.',
    });

    if (lecture.introduction) {
      segments.push({
        id: `ts-${idCounter++}`,
        section: 'Öğretmen Girişi',
        text: lecture.introduction,
        lang: 'tr',
        label: 'Ders Konsepti',
      });
    }

    // 2. Concrete Competency Target
    if (lecture.concreteCompetency) {
      segments.push({
        id: `ts-${idCounter++}`,
        section: 'Kazanım Hedefi',
        text: `Bu dersi tamamladığında kazanacağın somut beceri tam olarak şu: ${lecture.concreteCompetency}.`,
        lang: 'tr',
        label: 'Öğrenme Hedefi',
        teacherNote: 'Bu dersin sonunda bağımsız uygulayacağın hedef beceri.',
      });
    }

    // 3. Core Linguistic Logic (Anadili Konuşucusu Bakış Açısı)
    segments.push({
      id: `ts-${idCounter++}`,
      section: 'Temel Mantık',
      text: `Şimdi kuralı ezberlemek yerine, bir anadili konuşucusunun zihninde bu yapının neden var olduğuna bakalım. ${lecture.coreConcept.explanation}`,
      lang: 'tr',
      label: 'Kavramın Mantığı',
    });

    // Main Rule / Formula Card
    const mainRule = lecture.ruleCards && lecture.ruleCards.length > 0 ? lecture.ruleCards[0] : null;
    if (mainRule && mainRule.formula) {
      segments.push({
        id: `ts-${idCounter++}`,
        section: 'Temel Kural',
        text: `${persona.encouragingLeadIn} Temel kuralımız şöyle: ${mainRule.ruleTitle}.`,
        lang: 'tr',
        label: 'Kural Açıklaması',
      });

      segments.push({
        id: `ts-${idCounter++}`,
        section: 'Temel Kural',
        text: mainRule.formula,
        lang: 'en',
        label: 'İngilizce Yapı / Formül',
        teacherNote: 'İngilizce kalıbın doğal telaffuzu.',
      });
    }

    if (lecture.coreConcept.whyItMatters) {
      segments.push({
        id: `ts-${idCounter++}`,
        section: 'Önem & Nüans',
        text: `Bunun konuşurken neden bu kadar önemli olduğuna dikkat et: ${lecture.coreConcept.whyItMatters}`,
        lang: 'tr',
        label: 'Neden Önemli?',
      });
    }

    // 4. Step-by-Step Breakdown Sequence
    if (lecture.breakdownSteps && lecture.breakdownSteps.length > 0) {
      lecture.breakdownSteps.forEach((step: LectureBreakdownStep, idx: number) => {
        segments.push({
          id: `ts-${idCounter++}`,
          section: `Adım ${idx + 1}`,
          text: `Şimdi ${idx + 1}. adıma geçelim: ${step.title}. ${step.content}`,
          lang: 'tr',
          label: step.title,
        });

        if (step.keyPhrase) {
          segments.push({
            id: `ts-${idCounter++}`,
            section: `Adım ${idx + 1} Örnek`,
            text: `Örneğin şu ifadeyi benden dinle:`,
            lang: 'tr',
            label: 'Örnek Girişi',
          });
          segments.push({
            id: `ts-${idCounter++}`,
            section: `Adım ${idx + 1} Örnek`,
            text: step.keyPhrase,
            lang: 'en',
            label: 'İngilizce İfade',
            teacherNote: 'Doğal telaffuz ve tonlama ile dinleyin.',
          });
        }

        if (step.formula) {
          segments.push({
            id: `ts-${idCounter++}`,
            section: `Adım ${idx + 1} Kalıp`,
            text: step.formula,
            lang: 'en',
            label: 'Hedef Kalıp',
          });
        }
      });
    }

    // 5. Real-World Context & Conversational Dialogue
    if (lecture.realWorldContext?.scenarioTitle || lecture.realWorldContext?.description) {
      const scenarioText = lecture.realWorldContext.description || lecture.realWorldContext.scenarioTitle;
      segments.push({
        id: `ts-${idCounter++}`,
        section: 'Gerçek Hayat',
        text: `Hadi gel, şimdi bunu gerçek bir yaşam senaryosunda görelim. Senaryomuz: ${scenarioText}. Kulak ver:`,
        lang: 'tr',
        label: 'Senaryo Başlangıcı',
      });

      if (lecture.realWorldContext.dialogue && lecture.realWorldContext.dialogue.length > 0) {
        lecture.realWorldContext.dialogue.forEach((turn) => {
          const speaker = turn.speaker || 'Kişi';
          segments.push({
            id: `ts-${idCounter++}`,
            section: 'Diyalog',
            text: `${speaker}: ${turn.textEn}`,
            lang: 'en',
            label: `${speaker} (İngilizce)`,
            sourceContext: turn.textTr,
          });
          segments.push({
            id: `ts-${idCounter++}`,
            section: 'Diyalog Anlamı',
            text: `Yani Türkçesiyle: ${turn.textTr}`,
            lang: 'tr',
            label: `${speaker} (Türkçe Çevirisi)`,
          });
        });
      }
    }

    // 6. Common Student Mistakes & "Don't Say / Say" Traps
    if (lecture.commonMistakes && lecture.commonMistakes.length > 0) {
      segments.push({
        id: `ts-${idCounter++}`,
        section: 'Tuzaklar & Hatalar',
        text: `Şimdi çok önemli bir uyarı! Öğrencilerin en sık düştüğü hatalara ve doğrusuna dikkat edelim, sen bu tuzağa düşme:`,
        lang: 'tr',
        label: 'Hata Uyarısı',
      });

      lecture.commonMistakes.slice(0, 3).forEach((mistake: CommonMistakeItem) => {
        segments.push({
          id: `ts-${idCounter++}`,
          section: 'Hatalı Kullanım',
          text: `Sakın şöyle deme: ${mistake.wrongExample}`,
          lang: 'tr',
          label: 'Hatalı Cümle',
        });
        segments.push({
          id: `ts-${idCounter++}`,
          section: 'Doğru Kullanım',
          text: `Bunun yerine her zaman doğrusunu kullan: ${mistake.correctExample}`,
          lang: 'tr',
          label: 'Doğru Cümle',
        });
        segments.push({
          id: `ts-${idCounter++}`,
          section: 'Neden Hatalı?',
          text: `Çünkü: ${mistake.rootCause} ${mistake.memoryTip ? `Aklında kalsın diye ipucu: ${mistake.memoryTip}` : ''}`,
          lang: 'tr',
          label: 'Hata Mantığı',
        });
      });
    }

    // 7. Encouraging Check Invitation
    if (lecture.quickCheck?.question) {
      segments.push({
        id: `ts-${idCounter++}`,
        section: 'Kavrama Kontrolü',
        text: `Gördüğün gibi kavram son derece net ve mantıklı! Şimdi sıra sende: Aşağıdaki hızlı kavrama sorusunu çözerek öğrendiklerini anında pekiştir. Başarılar!`,
        lang: 'tr',
        label: 'Kontrol Sorusu Daveti',
        teacherNote: 'Öğretmen seni aşağıdaki interaktif soruya davet ediyor.',
      });
    }

    this.segments = segments;
    this.notifySegment(-1);
    return segments;
  }

  // --- Sequential Playback Engine ---
  public play(startIndex: number = 0) {
    if (this.segments.length === 0) return;
    if (this.playbackState === 'paused' && this.currentSegmentIndex === startIndex) {
      this.resume();
      return;
    }
    this.stop();
    this.playSegmentAtIndex(startIndex);
  }

  public pause() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.playbackState === 'playing') {
      window.speechSynthesis.pause();
      this.notifyState('paused');
    }
  }

  public resume() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.playbackState === 'paused') {
      window.speechSynthesis.resume();
      this.notifyState('playing');
    }
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.activeUtterance = null;
    this.notifyState('idle');
  }

  public jumpToSegment(index: number) {
    if (index >= 0 && index < this.segments.length) {
      this.stop();
      this.playSegmentAtIndex(index);
    }
  }

  private playSegmentAtIndex(index: number) {
    if (index < 0 || index >= this.segments.length) {
      this.stop();
      this.notifySegment(-1);
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const seg = this.segments[index];
    this.notifySegment(index);
    this.notifyState('playing');

    const cleanText = this.sanitizeTextForTTS(seg.text);
    if (!cleanText) {
      this.playSegmentAtIndex(index + 1);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = this.rate;

    const personaConfig = TEACHER_PERSONAS[this.activePersona];
    utterance.pitch = personaConfig.pitch;

    const voices = window.speechSynthesis.getVoices();

    if (seg.lang === 'tr') {
      utterance.lang = 'tr-TR';
      const selected = this.selectedTrVoiceURI
        ? voices.find((v) => v.voiceURI === this.selectedTrVoiceURI)
        : null;
      const trVoice =
        selected ||
        voices.find(
          (v) =>
            v.lang.startsWith('tr') &&
            (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Yelda') || v.name.includes('Cem'))
        ) ||
        voices.find((v) => v.lang.startsWith('tr'));

      if (trVoice) utterance.voice = trVoice;
    } else {
      utterance.lang = 'en-US';
      const selected = this.selectedEnVoiceURI
        ? voices.find((v) => v.voiceURI === this.selectedEnVoiceURI)
        : null;
      const enVoice =
        selected ||
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('David') ||
              v.name.includes('Jenny') ||
              v.name.includes('Aria'))
        ) ||
        voices.find((v) => v.lang.startsWith('en'));

      if (enVoice) utterance.voice = enVoice;
    }

    utterance.onend = () => {
      this.activeUtterance = null;
      // Natural human breathing pause between thoughts
      setTimeout(() => {
        if (this.playbackState === 'playing') {
          this.playSegmentAtIndex(index + 1);
        }
      }, personaConfig.pauseBetweenSegmentsMs);
    };

    utterance.onerror = (e) => {
      console.warn('Natural Bilingual TTS segment error:', e);
      this.activeUtterance = null;
      if (this.playbackState === 'playing') {
        this.playSegmentAtIndex(index + 1);
      }
    };

    this.activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  // --- Standalone Single Utterance with Automatic Language Selection ---
  /**
   * Speak any standalone word or sentence with automatic language detection (used by audio buttons)
   */
  public speakSingle(
    text: string,
    options: {
      lang?: LanguageCode | 'auto';
      rate?: SpeechRate;
      onStart?: () => void;
      onEnd?: () => void;
    } = {}
  ): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    try {
      this.stop(); // Stop ongoing teacher lecture so audio doesn't overlap
      if (this.singleUtterance) {
        window.speechSynthesis.cancel();
        this.singleUtterance = null;
      }

      const cleanText = this.sanitizeTextForTTS(text);
      if (!cleanText) return false;

      const detectedLang =
        options.lang && options.lang !== 'auto' ? options.lang : this.detectLanguage(cleanText);

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = options.rate || this.rate;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (detectedLang === 'tr') {
        utterance.lang = 'tr-TR';
        const trVoice =
          (this.selectedTrVoiceURI && voices.find((v) => v.voiceURI === this.selectedTrVoiceURI)) ||
          voices.find((v) => v.lang.startsWith('tr') && (v.name.includes('Natural') || v.name.includes('Google'))) ||
          voices.find((v) => v.lang.startsWith('tr'));
        if (trVoice) utterance.voice = trVoice;
      } else {
        utterance.lang = 'en-US';
        const enVoice =
          (this.selectedEnVoiceURI && voices.find((v) => v.voiceURI === this.selectedEnVoiceURI)) ||
          voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))) ||
          voices.find((v) => v.lang.startsWith('en'));
        if (enVoice) utterance.voice = enVoice;
      }

      utterance.onstart = () => {
        if (options.onStart) options.onStart();
      };

      utterance.onend = () => {
        this.singleUtterance = null;
        if (options.onEnd) options.onEnd();
      };

      utterance.onerror = (e) => {
        console.warn('Speech error:', e);
        this.singleUtterance = null;
        if (options.onEnd) options.onEnd();
      };

      this.singleUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.warn('Single speech error:', err);
      if (options.onEnd) options.onEnd();
      return false;
    }
  }
}

export const audioEngine = new NaturalBilingualAudioEngine();
