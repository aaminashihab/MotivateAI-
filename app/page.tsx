"use client";

import { useState, useEffect } from 'react';
import TaskList, { Task } from '@/components/TaskList';
import BreakManager from '@/components/BreakManager';
import VideoEmbed from '@/components/VideoEmbed';
import AdaptiveGoalInput from '@/components/AdaptiveGoalInput';
import StreakWidget from '@/components/StreakWidget';
import Link from 'next/link';

const isToday = (date1: Date, date2: Date) => date1.toDateString() === date2.toDateString();
const isYesterday = (date1: Date, date2: Date) => {
  const yesterday = new Date(date1);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toDateString() === date2.toDateString();
};
const isDayBeforeYesterday = (date1: Date, date2: Date) => {
  const dayBefore = new Date(date1);
  dayBefore.setDate(dayBefore.getDate() - 2);
  return dayBefore.toDateString() === date2.toDateString();
};

export default function Home() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoData, setVideoData] = useState<{ videoId: string, title: string } | null>(null);
  const [streak, setStreak] = useState(0);
  const [userId, setUserId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');

  // Load session and streak on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let currentUserId = localStorage.getItem('motivateai_user_id');
      if (!currentUserId) {
        currentUserId = `user_${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem('motivateai_user_id', currentUserId);
        window.location.href = '/onboarding';
        return;
      }
      setUserId(currentUserId);

      const savedSession = localStorage.getItem('motivateai_session');
      if (savedSession) {
        try {
          const data = JSON.parse(savedSession);
          if (data.tasks && data.tasks.length > 0) {
            setGoal(data.goal || '');
            setTasks(data.tasks);
            setActiveIndex(data.activeIndex || 0);
            setVideoData(data.videoData || null);
            if (data.sessionId) setSessionId(data.sessionId);
          }
        } catch (e) {}
      }

      const savedStreak = localStorage.getItem('motivateai_streak');
      const lastCompletedStr = localStorage.getItem('motivateai_last_completed');
      if (savedStreak && lastCompletedStr) {
        const lastCompleted = new Date(lastCompletedStr);
        const today = new Date();
        if (isToday(today, lastCompleted) || isYesterday(today, lastCompleted) || isDayBeforeYesterday(today, lastCompleted)) {
          setStreak(parseInt(savedStreak));
        } else {
          setStreak(0);
          localStorage.setItem('motivateai_streak', '0');
        }
      } else if (savedStreak) {
        setStreak(parseInt(savedStreak));
      }
    }
  }, []);

  // Save session when active
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (tasks.length > 0) {
        localStorage.setItem('motivateai_session', JSON.stringify({
          goal, tasks, activeIndex, videoData, sessionId
        }));
      } else {
        localStorage.removeItem('motivateai_session');
      }
    }
  }, [goal, tasks, activeIndex, videoData]);

  const handleGenerate = async () => {
    if (!goal) return;
    setLoading(true);
    setTasks([]);
    setVideoData(null);
    setActiveIndex(0);
    setSessionId('');
    if (typeof window !== 'undefined') localStorage.removeItem('motivateai_timer_state');

    try {
      // 1. Fetch Task Breakdown
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      });
      const data = await res.json();
      
      if (data.tasks) {
        setTasks(data.tasks);
      } else {
        alert("Failed to parse tasks. Please try again.");
      }

      // Calculate total duration for video filter
      const totalDuration = data.tasks ? data.tasks.reduce((sum: number, t: any) => sum + (t.durationMinutes || t.duration || 15), 0) : 15;
      
      // 2. Fetch Relevant YouTube Video
      const ytRes = await fetch(`/api/youtube?q=${encodeURIComponent(goal)}&duration=${totalDuration}`);
      const ytData = await ytRes.json();
      if (ytData.videoId) {
        setVideoData(ytData);
      }

    } catch (err) {
      console.error(err);
      alert('An error occurred while generating your plan.');
    } finally {
      setLoading(false);
    }
  };

  const handleSessionGenerated = async (plan: any) => {
    // Map adaptive plan to local Task format
    const newTasks = plan.tasks.map((t: any) => ({
      id: t.id,
      title: t.name,
      duration: t.durationMinutes
    }));
    
    setTasks(newTasks);
    setGoal(plan.goal);
    setActiveIndex(0);
    if (plan.sessionId) setSessionId(plan.sessionId);
    if (typeof window !== 'undefined') localStorage.removeItem('motivateai_timer_state');
    
    // Calculate total duration for video filter
    const totalDuration = plan.tasks.reduce((sum: number, t: any) => sum + (t.durationMinutes || t.duration || 15), 0);
    
    // Fetch video
    try {
      const ytRes = await fetch(`/api/youtube?q=${encodeURIComponent(plan.goal)}&duration=${totalDuration}`);
      const ytData = await ytRes.json();
      if (ytData.videoId) {
        setVideoData(ytData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTaskComplete = async () => {
    const newActiveIndex = activeIndex + 1;
    
    // Send update to database
    if (userId && sessionId) {
      try {
        await fetch('/api/session/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            sessionId,
            tasksCompleted: newActiveIndex,
            taskCount: tasks.length
          })
        });
      } catch (err) {
        console.error('Failed to update session:', err);
      }
    }

    if (activeIndex < tasks.length - 1) {
      setActiveIndex(newActiveIndex);
    } else {
      // Session Complete!
      if (typeof window !== 'undefined') {
        const today = new Date();
        const lastCompletedStr = localStorage.getItem('motivateai_last_completed');
        let newStreak = streak;

        if (!lastCompletedStr || !isToday(today, new Date(lastCompletedStr))) {
          newStreak += 1;
          setStreak(newStreak);
          localStorage.setItem('motivateai_streak', newStreak.toString());
          localStorage.setItem('motivateai_last_completed', today.toISOString());
        }
        localStorage.removeItem('motivateai_session');
        localStorage.removeItem('motivateai_timer_state');
      }

      alert("Congratulations! You've completed your action plan.");
      setActiveIndex(tasks.length); // All done
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1536px]">
      <div className="flex flex-col md:flex-row justify-between items-start flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400 mb-2 animate-slide-down">
            MotivateAI
          </h1>
          <p className="text-slate-400 text-lg md:text-xl animate-fade-in opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
            Your Autonomous Agent for Building Consistency
          </p>
        </div>
        <div className="flex gap-4 w-full md:w-auto mt-4 md:mt-0">
          {/* Old small streak removed in favor of large widget */}
        </div>
      </div>

      <div className="mb-8">
        <StreakWidget streak={{
          currentStreak: streak || 3, // Fallback to 3 for demo if 0
          longestStreak: Math.max(streak || 3, 12),
          lastActiveDate: new Date(),
          thisWeek: [true, true, true, false, false, false, false]
        }} />
      </div>

      {!tasks.length && userId && (
        <AdaptiveGoalInput 
          userId={userId} 
          onSessionGenerated={handleSessionGenerated} 
        />
      )}

      {tasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <div className="order-2 md:order-1 lg:order-1">
            <TaskList tasks={tasks} activeIndex={activeIndex} />
          </div>
          <div className="order-1 md:order-2 lg:order-2">
            {activeIndex < tasks.length ? (
              <BreakManager 
                initialMinutes={tasks[activeIndex].duration} 
                taskIndex={activeIndex}
                taskName={tasks[activeIndex].title}
                totalTasks={tasks.length}
                onComplete={handleTaskComplete}
              />
            ) : (
              <div className="glass-panel text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">Session Complete! 🎉</h2>
                <p className="text-slate-300 mb-6">Great job staying consistent today.</p>
                <button 
                  onClick={() => setTasks([])}
                  className="w-full md:w-auto min-h-[48px] bg-accent hover:bg-accent-hover text-white font-semibold py-3 px-6 rounded-xl transition-all"
                >
                  Start New Session
                </button>
              </div>
            )}
          </div>
          
          {videoData && (
            <div className="order-3 md:order-3 md:col-span-2 lg:col-span-1 lg:order-3">
              <VideoEmbed videoId={videoData.videoId} title={videoData.title} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
