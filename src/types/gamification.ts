// Gamification Types
// Types for code challenges, XP system, and user progress

export interface Challenge {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'code_output';
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

export interface ChallengeSet {
  moduleIndex: number;
  moduleTitle: string;
  challenges: Challenge[];
  generatedAt: number;
}

export interface ChallengeResult {
  challengeId: string;
  correct: boolean;
  selectedAnswer: string;
  earnedPoints: number;
}

export interface UserProgress {
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  challengesCompleted: number;
  correctAnswers: number;
  totalAnswers: number;
  lastActivityDate: string; // ISO date string
}

export interface ChallengeState {
  isOpen: boolean;
  currentSet: ChallengeSet | null;
  currentIndex: number;
  results: ChallengeResult[];
  isLoading: boolean;
  error: string | null;
}

export const DEFAULT_USER_PROGRESS: UserProgress = {
  totalXP: 0,
  currentStreak: 0,
  longestStreak: 0,
  challengesCompleted: 0,
  correctAnswers: 0,
  totalAnswers: 0,
  lastActivityDate: '',
};
