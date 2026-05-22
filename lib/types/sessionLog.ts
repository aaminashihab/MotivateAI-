import { ObjectId } from 'mongodb';

export interface TaskData {
  taskId: string;
  taskName: string;
  taskDescription: string;
  estimatedDuration: number; // in minutes
  actualDuration?: number; // in minutes (populated on task completion)
  completed: boolean;
  startedAt?: Date;
  completedAt?: Date;
  abandonedAt?: Date; // if user quit early
  userDifficulty?: 'easy' | 'just_right' | 'hard'; // feedback after task
  resourceUrl?: string; // YouTube video URL shown
  skipped?: boolean; // if user skipped the task entirely
}

export interface BreakData {
  breakNumber: number;
  breakDuration: number; // 5 minutes default
  skipped: boolean;
  paused: boolean;
  pauseCount: number;
  timeRemaining?: number; // if skipped, how much time was left?
  breakActivity?: 'hydrate' | 'breathe' | 'stretch' | 'motivate'; // which activity shown
  completedAt?: Date;
}

export interface BehaviorSignals {
  prefersShortTasks: boolean; // avg task < 18 minutes
  skipsBreaks: boolean; // >40% skip rate
  highVariance: boolean; // standard deviation in task times > 10 min
  dropoutAfterMinutes?: number; // consistent dropout point (e.g., always quits after 45 min)
  completionConfidence: number; // 0-100 score
  bestTimeOfDay?: 'morning' | 'afternoon' | 'evening'; // when user completes most tasks
  consistencyScore: number; // 0-100: how predictable their session completion is
  engagementLevel: 'low' | 'medium' | 'high'; // based on streak + completion rate
}

export interface SessionLog {
  _id?: ObjectId;
  userId: string;
  sessionId: string;
  goal: string; // what they wanted to accomplish
  
  // Session-level metadata
  startedAt: Date;
  completedAt?: Date;
  totalSessionTime: number; // in minutes (actual)
  estimatedSessionTime: number; // in minutes (planned)
  
  // Task and break arrays
  tasks: TaskData[];
  breaks: BreakData[];
  
  // Metrics
  completionRatio: number; // (completed tasks / total tasks) * 100
  tasksCompleted: number;
  tasksSkipped?: number; // How many tasks user explicitly skipped
  taskCount: number;
  abandoned?: boolean; // True if the user hit "End Session Early"
  
  // Dropout tracking
  dropoutPoint?: {
    afterTaskNumber?: number;
    afterBreakNumber?: number;
    reason?: 'user_quit' | 'timeout' | 'error';
    minutesInto: number;
  };
  
  // Streak
  streakContinued: boolean;
  
  // User-provided feedback
  sessionDifficulty?: 'too_easy' | 'just_right' | 'too_hard';
  sessionRating?: number; // 1-5 star rating
  sessionNotes?: string; // optional user comment
  
  // Behavior signals (calculated on session completion)
  signals?: BehaviorSignals;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  userId: string;
  
  // Computed from last 10 sessions
  recentSessions: number;
  avgTaskDuration: number;
  avgTaskDurationStdDev: number;
  avgEstimateAccuracy: number; // (actual - estimated) / estimated * 100, lower is better
  overallCompletionRate: number; // 0-100
  averageBreakSkipRate: number; // 0-100
  
  // Behavior patterns
  signals: BehaviorSignals;
  
  // Personalization
  preferredTaskDuration: 'short' | 'medium' | 'long'; // 10-15, 20-25, 30+
  optimalBreakTiming: number; // minutes into session to insert break
  sessionConsistency: 'unpredictable' | 'somewhat_consistent' | 'very_consistent';
  
  // Historical insight
  totalHoursInvested: number;
  longestStreak: number;
  currentStreak: number;
  lastSessionDate: Date;
  
  // Adaptation tracking
  adaptationHistory: {
    date: Date;
    changeApplied: string; // "switched to 15-min tasks", "moved break to 20 min"
    impactScore?: number; // did completion rate improve?
  }[];
  
  // Real Profile Analytics
  consistencyTrend?: { date: string; completionRate: number; engagement: number }[];
  performanceByTime?: { time: string; performance: number }[];
  weeklyStats?: { totalSessions: number; totalHours: number; avgPerSession: string; streakDays: number };
  optimizations?: any[]; // Array of Adaptation objects
  
  updatedAt: Date;
}
