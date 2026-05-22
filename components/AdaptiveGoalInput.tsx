'use client';

import { useState } from 'react';
import { AdaptiveSessionPlan } from '@/lib/services/adaptiveSessionGenerator';

interface AdaptiveGoalInputProps {
  userId: string;
  onSessionGenerated: (plan: AdaptiveSessionPlan) => void;
  isLoading?: boolean;
}

export default function AdaptiveGoalInput({
  userId,
  onSessionGenerated,
  isLoading = false,
}: AdaptiveGoalInputProps) {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!goal.trim()) {
      setError('Please enter a goal');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/session/generate-adaptive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate session');
      }

      const sessionPlan: AdaptiveSessionPlan = await response.json();

      setGoal('');
      onSessionGenerated(sessionPlan);
    } catch (err: any) {
      console.error('Session generation failed:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel mx-auto max-w-2xl w-full">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">What do you want to accomplish today?</h2>
      <form onSubmit={handleGenerateSession}>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            className="flex-1 bg-black/30 border border-white/10 rounded-xl px-6 py-4 text-white text-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40 shadow-inner transition-all min-h-[48px]"
            type="text"
            placeholder="e.g., I want to learn Python basics"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={loading || isLoading}
            spellCheck={false}
            autoComplete="off"
          />
          <button 
            type="submit" 
            disabled={loading || isLoading || !goal}
            className="min-h-[48px] px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 disabled:opacity-50 disabled:from-slate-600 disabled:to-slate-700 hover:shadow-[0_0_20px_rgba(139,92,246,0.6)] text-white font-bold rounded-xl transition-all duration-300"
          >
            {(loading || isLoading) ? <span className="loader"></span> : 'Start'}
          </button>
        </div>

        {error && <p className="text-red-400 mt-4">{error}</p>}

        <p className="text-slate-400 text-sm mt-4">
          💡 MotivateAI is learning your study style and will personalize
          future sessions for maximum completion!
        </p>
      </form>
    </div>
  );
}
