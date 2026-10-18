import { CEFRLevel } from './lesson';

export interface MistakeRecord {
  id: string;
  lessonId: number;
  lessonTitle: string;
  lessonCode: string;
  level: CEFRLevel;
  exerciseId: string;
  prompt: string;
  sentence?: string;
  userWrongAnswer: string;
  correctAnswer: string;
  explanation: string;
  ruleSnippet?: string;
  timestamp: number;
  reviewCount: number;
  status: 'due' | 'reviewed' | 'mastered';
  nextReviewDate: number;
  intervalDays: number;
  easeFactor: number;
}

export interface SRSStats {
  totalMistakes: number;
  dueCount: number;
  reviewedCount: number;
  masteredCount: number;
}
