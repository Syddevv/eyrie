import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

export type SavingsGoal = {
  id: string;
  title: string;
  targetLabel: string;
  targetDateLabel: string;
  savedAmount: number;
  goalAmount: number;
  achievedLabel: string;
  remainingLabel: string;
  progress: number;
  accent: string;
  iconBackground: string;
  icon: ReactNode;
  iconSymbol: 'shield' | 'monitor' | 'travel' | 'car';
  contributions: string[];
  contributionHistory: { date: string; amount: string }[];
  monthlyTarget: string;
};

export const savingsGoals: SavingsGoal[] = [
  {
    id: 'emergency-fund',
    title: 'Emergency Fund',
    targetLabel: 'Target: Aug 2026',
    targetDateLabel: 'Aug 2026',
    savedAmount: 112500,
    goalAmount: 150000,
    achievedLabel: '75% achieved',
    remainingLabel: '₱37,500 to go',
    progress: 0.75,
    accent: '#17C964',
    iconBackground: '#0FBD59',
    icon: <Ionicons name="shield-checkmark-outline" size={24} color="#FFFFFF" />,
    iconSymbol: 'shield',
    contributions: ['+₱10,000', '+₱15,000', '+₱10,000'],
    contributionHistory: [
      { date: 'May 6', amount: '+₱10,000' },
      { date: 'Apr 28', amount: '+₱15,000' },
      { date: 'Apr 12', amount: '+₱10,000' },
    ],
    monthlyTarget: '₱12,500',
  },
  {
    id: 'new-macbook',
    title: 'New MacBook',
    targetLabel: 'Target: Dec 2026',
    targetDateLabel: 'Dec 2026',
    savedAmount: 45000,
    goalAmount: 85000,
    achievedLabel: '53% achieved',
    remainingLabel: '₱40,000 to go',
    progress: 0.53,
    accent: '#1495FF',
    iconBackground: '#1495FF',
    icon: <Feather name="monitor" size={22} color="#FFFFFF" />,
    iconSymbol: 'monitor',
    contributions: ['+₱5,000', '+₱8,000'],
    contributionHistory: [
      { date: 'May 3', amount: '+₱5,000' },
      { date: 'Apr 20', amount: '+₱8,000' },
    ],
    monthlyTarget: '₱13,334',
  },
  {
    id: 'japan-trip',
    title: 'Japan Trip',
    targetLabel: 'Target: Mar 2027',
    targetDateLabel: 'Mar 2027',
    savedAmount: 35000,
    goalAmount: 120000,
    achievedLabel: '29% achieved',
    remainingLabel: '₱85,000 to go',
    progress: 0.29,
    accent: '#7E7CFF',
    iconBackground: '#7E7CFF',
    icon: <Ionicons name="airplane-outline" size={22} color="#FFFFFF" />,
    iconSymbol: 'travel',
    contributions: ['+₱5,000', '+₱10,000'],
    contributionHistory: [
      { date: 'May 2', amount: '+₱5,000' },
      { date: 'Apr 15', amount: '+₱10,000' },
    ],
    monthlyTarget: '₱9,445',
  },
  {
    id: 'car-down-payment',
    title: 'Car Down Payment',
    targetLabel: 'Target: Jun 2027',
    targetDateLabel: 'Jun 2027',
    savedAmount: 28000,
    goalAmount: 200000,
    achievedLabel: '14% achieved',
    remainingLabel: '₱172,000 to go',
    progress: 0.14,
    accent: '#F09A2A',
    iconBackground: '#F09A2A',
    icon: <MaterialCommunityIcons name="car-outline" size={22} color="#FFFFFF" />,
    iconSymbol: 'car',
    contributions: ['+₱8,000'],
    contributionHistory: [{ date: 'Apr 30', amount: '+₱8,000' }],
    monthlyTarget: '₱15,636',
  },
] as const;

