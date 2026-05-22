"use client";
import { useState, useEffect } from 'react';

export default function BreakManager({ 
  initialMinutes, 
  taskIndex,
  taskName,
  onComplete 
}: { 
  initialMinutes: number, 
  taskIndex: number,
  taskName?: string,
  totalTasks?: number,
  onComplete: () => void 
}) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreakMode, setIsBreakMode] = useState(false);
  const [activityIndex, setActivityIndex] = useState(0);
  const [breakDuration, setBreakDuration] = useState(5); // Default 5 minutes

  const ACTIVITIES = [
    "💧 Time to hydrate! Grab a glass of water.",
    "🫁 Take 3 deep breaths. Inhale... Exhale...",
    "🌟 'Small daily improvements over time lead to stunning results.'",
    "🚶‍♂️ Stand up and stretch your legs for a moment."
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('motivateai_timer_state');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.taskIndex === taskIndex) {
            setTimeLeft(parsed.timeLeft);
            setIsBreakMode(parsed.isBreakMode || false);
            setActivityIndex(parsed.activityIndex || Math.floor(Math.random() * ACTIVITIES.length));
            setIsActive(false);
            return;
          }
        } catch (e) {}
      }
    }
    setTimeLeft(initialMinutes * 60);
    setIsBreakMode(false);
    setIsActive(false);
    setActivityIndex(Math.floor(Math.random() * ACTIVITIES.length));

    // Fetch user preferences for break duration
    if (typeof window !== 'undefined') {
      const currentUserId = localStorage.getItem('motivateai_user_id');
      if (currentUserId) {
        fetch(`/api/users/${currentUserId}/preferences`)
          .then(res => res.json())
          .then(data => {
            if (data && data.minBreakDuration) {
              setBreakDuration(data.minBreakDuration);
            }
          })
          .catch(err => console.error("Failed to load preferences in BreakManager", err));
      }
    }
  }, [initialMinutes, taskIndex]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('motivateai_timer_state', JSON.stringify({
        taskIndex,
        timeLeft,
        isBreakMode,
        activityIndex
      }));
    }
  }, [timeLeft, taskIndex, isBreakMode, activityIndex]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      if (isBreakMode) {
        onComplete();
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, onComplete, isBreakMode]);

  const toggleTimer = () => setIsActive(!isActive);

  const handleMarkDone = () => {
    if (!isBreakMode) {
      setIsBreakMode(true);
      setTimeLeft(breakDuration * 60); // Use preference break duration
      setIsActive(true); // Auto-start break timer
    }
  };

  const handleSkipBreak = () => {
    onComplete();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isBreakMode) {
    return (
      <div className="glass-panel text-center border-success/50">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Break Time ({breakDuration} Min)</h2>
        <p className="text-success mb-6 px-4">{ACTIVITIES[activityIndex]}</p>
        <div className="text-6xl md:text-7xl lg:text-8xl font-extrabold my-8 tabular-nums bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 to-white">
          {formatTime(timeLeft)}
        </div>
        <div className="flex flex-col md:flex-row justify-center gap-4">
          <button 
            onClick={toggleTimer}
            className="min-h-[48px] px-8 py-3 rounded-xl font-semibold bg-accent hover:bg-accent-hover text-white transition-all w-full md:w-auto"
          >
            {isActive ? 'Pause' : 'Resume'}
          </button>
          <button 
            onClick={handleSkipBreak} 
            className="min-h-[48px] px-8 py-3 rounded-xl font-semibold bg-white/5 border border-slate-500 hover:bg-white/10 text-white transition-all w-full md:w-auto"
          >
            Skip Break
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel text-center">
      {taskName && (
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          📚 {taskName}
        </h2>
      )}
      <p className="text-purple-300 text-sm font-medium mb-1 uppercase tracking-wider">Current Task Timer</p>
      
      {totalTasks && (
        <p className="text-slate-400 text-sm font-semibold">
          Progress: Task {taskIndex + 1} of {totalTasks} ({initialMinutes} min)
        </p>
      )}

      <div className="text-6xl md:text-7xl lg:text-8xl font-extrabold my-6 tabular-nums bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400">
        {formatTime(timeLeft)}
      </div>
      <div className="flex flex-col md:flex-row justify-center gap-4">
        <button 
          onClick={toggleTimer}
          className="min-h-[48px] px-8 py-3 rounded-xl font-semibold bg-accent hover:bg-accent-hover text-white transition-all w-full md:w-auto"
        >
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button 
          onClick={handleMarkDone} 
          className="min-h-[48px] px-8 py-3 rounded-xl font-semibold bg-success hover:bg-emerald-600 text-white transition-all w-full md:w-auto"
        >
          Mark Done
        </button>
      </div>
    </div>
  );
}
