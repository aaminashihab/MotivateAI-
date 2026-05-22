"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SessionCompleteModalProps {
  userId: string;
  sessionId: string;
  totalTasks: number;
  onClose: () => void;
}

export default function SessionCompleteModal({ userId, sessionId, totalTasks, onClose }: SessionCompleteModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Send the final completion with the rating
      await fetch('/api/session/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionId,
          tasksCompleted: totalTasks,
          taskCount: totalTasks,
          sessionRating: rating
        })
      });
      
      onClose();
      router.push('/profile');
    } catch (e) {
      console.error('Failed to save rating:', e);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-fade-in">
      <div className="glass-panel w-full max-w-md animate-slide-down shadow-[0_0_50px_rgba(139,92,246,0.2)]">
        
        {/* Header Animation */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-tr from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-[bounce_2s_infinite]">
            🏆
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-center text-white mb-2">Session Complete!</h2>
        <p className="text-center text-purple-300 mb-8">
          You crushed your goals today. How did this session feel?
        </p>

        {/* Star Rating */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="text-4xl transition-transform hover:scale-110 focus:outline-none"
            >
              <span className={`transition-colors duration-200 ${
                star <= (hoverRating || rating) 
                  ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' 
                  : 'text-slate-600'
              }`}>
                ★
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || saving}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/20"
          >
            {saving ? 'Saving...' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
