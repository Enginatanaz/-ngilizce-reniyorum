import React from 'react';
import { TeacherLectureData } from '../../types/lesson';
import { LiveTeacherStudio } from './LiveTeacherStudio';

interface TeacherAudioPlayerProps {
  lecture: TeacherLectureData;
}

export const TeacherAudioPlayer: React.FC<TeacherAudioPlayerProps> = ({ lecture }) => {
  return <LiveTeacherStudio lecture={lecture} />;
};
