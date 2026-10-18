import { CEFRLevel } from './lesson';

export interface ModuleDef {
  id: string;
  level: CEFRLevel;
  title: string;
  description: string;
  order: number;
  iconName: string;
  lessonIds: number[];
}

export interface CurriculumLessonDef {
  id: number;
  code: string;
  level: CEFRLevel;
  moduleId: string;
  moduleName: string;
  title: string;
  description: string;
  learningObjectives: string[];
  order: number;
  estimatedDuration: number; // minutes
  prerequisites: number[]; // previous lesson IDs
  activities: (
    | 'grammar'
    | 'vocabulary'
    | 'listening'
    | 'reading'
    | 'writing'
    | 'speaking'
    | 'ai_interaction'
    | 'exercises'
  )[];
  assessmentCriteria: string;
  xpReward: number;
}

export interface LevelInfo {
  id: CEFRLevel;
  name: string;
  titleTr: string;
  tagline: string;
  description: string;
  overallGoal: string;
  learningObjectives: string[];
  assessmentTitle: string;
  assessmentDescription: string;
  colorScheme: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    gradient: string;
    accent: string;
  };
}

export type LessonDisplayStatus = 'completed' | 'in_progress' | 'next' | 'locked';
