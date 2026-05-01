import { Timestamp } from 'firebase/firestore';

export type PriorityLevel = 'high' | 'medium' | 'low';

export interface KaizenItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Timestamp;
  timeLimit?: number; // Duration in minutes
  points?: number; // Custom points for this task
  priority: PriorityLevel;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
  redeemed: boolean;
  redeemedAt?: Timestamp;
}

export type WinCategory = 'mind' | 'body' | 'nutrition' | 'growth' | 'wealth' | 'fun';

export interface WinDefinition {
  id: number; // 0-9
  title: string;
  category: WinCategory;
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  emoji?: string;
  createdAt: Timestamp;
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  dayOfMonth?: number; // 1-31
}

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  dayOfMonth?: number; // 1-31
}

export type SubscriptionTier = 'free' | 'lite' | 'premium';

export interface AppConfig {
  maintenanceMode: boolean;
  enableAiCoach: boolean;
  globalAnnouncement?: string;
}

export interface UserMetadata {
  // Onboarding / Profile Data
  displayName?: string;
  onboardingCompleted?: boolean;
  mainFocus?: WinCategory;
  secondaryFocus?: WinCategory;
  dailyCommitmentMinutes?: number;
  subscriptionTier?: SubscriptionTier;
  isAdmin?: boolean; // New flag for backend access

  // Lifestyle Data
  wakeTime?: string;
  bedTime?: string;
  waterGoal?: number; // Liters
  mindfulnessGoal?: number; // Minutes

  // App Data
  points: number;
  rewards: Reward[];
  winDefinitions?: WinDefinition[]; // The user's custom 10 wins
  financialGoals?: FinancialGoal[];
  defaultDailyBudget?: number;
  currencySymbol?: string;
  incomeSources?: IncomeSource[];
  monthlySalary?: number; // Deprecated
  recurringBills?: RecurringBill[];
}

export interface AudioNote {
  id: string;
  url: string;
  transcription?: string;
  createdAt: Timestamp;
  duration?: number;
}

export interface HistoryEntry {
  active: boolean; // Did they use the app/complete a Kaizen task?
  winsCompleted?: number[]; // Array of IDs (0-9) completed that day
  mood?: number; // 1 (Sad) to 5 (Elated)
  journal?: string;
  gratitude?: string[]; // Array of 3 things
  imageUrls?: string[];
  audioNotes?: AudioNote[];
  dailySpend?: number; // Total spent that day
  dailyBudget?: number; // Specific budget limit for this day (overrides default)
  savingsDeposited?: number; // Total amount put into savings on this day
}