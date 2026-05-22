'use client';

import { useEffect, useState } from 'react';
import BehaviorInsights from '@/components/BehaviorInsights';
import AdaptationCard from '@/components/AdaptationCard';
import { UserProfile } from '@/lib/types/sessionLog';
import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const consistencyData = [
  { date: 'Mon', completionRate: 60, engagement: 45 },
  { date: 'Tue', completionRate: 65, engagement: 50 },
  { date: 'Wed', completionRate: 72, engagement: 58 },
  { date: 'Thu', completionRate: 78, engagement: 65 },
  { date: 'Fri', completionRate: 85, engagement: 72 },
  { date: 'Sat', completionRate: 88, engagement: 80 },
  { date: 'Sun', completionRate: 92, engagement: 85 },
];

const performanceByTime = [
  { time: '6-8 AM', performance: 92 },
  { time: '8-10 AM', performance: 95 },
  { time: '10-12 PM', performance: 78 },
  { time: '2-4 PM', performance: 65 },
  { time: '6-8 PM', performance: 72 },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [adaptations] = useState<any[]>([
    {
      id: '1',
      type: 'break_length',
      before: '2 min breaks',
      after: '5 min breaks',
      reason: 'You were skipping breaks, causing focus drops after 30 min',
      impact: 23,
      timestamp: new Date('2026-05-20'),
      aiReasoning: 'Analysis shows your engagement drops 40% after 30 minutes of continuous work. By increasing break duration to 5 minutes, you can recharge mentally and maintain 85%+ focus throughout sessions.'
    },
    {
      id: '2',
      type: 'session_time',
      before: 'Afternoon sessions',
      after: 'Morning sessions',
      reason: 'Your performance peaks at 9-11 AM based on 7-day history',
      impact: 34,
      timestamp: new Date('2026-05-18'),
      aiReasoning: 'Your completion rate is 95% in morning sessions vs 62% in afternoon. We\'ve rescheduled your high-difficulty tasks for 9-11 AM when your energy and focus are highest.'
    },
    {
      id: '3',
      type: 'task_duration',
      before: '30-40 min task blocks',
      after: '15-20 min task blocks',
      reason: 'Shorter tasks match your focus span and boost completion confidence.',
      impact: 28,
      timestamp: new Date('2026-05-16'),
      aiReasoning: 'You maintain peak focus for approximately 15-20 minutes before concentration dips. By breaking larger concepts into smaller, achievable chunks, you experience more frequent "wins" which boost motivation and maintain momentum.'
    },
    {
      id: '4',
      type: 'difficulty',
      before: 'Mixed difficulty tasks',
      after: 'Easy → Medium progression',
      reason: 'Progressive difficulty builds confidence and prevents burnout.',
      impact: 19,
      timestamp: new Date('2026-05-14'),
      aiReasoning: 'Your skip rate increases when you encounter hard tasks early in the week. By scheduling difficulty progression (Easy early week → Medium mid-week → Hard Friday), you build momentum and confidence.'
    },
    {
      id: '5',
      type: 'focus_strategy',
      before: 'Long reading assignments',
      after: 'Video tutorials + Interactive practice',
      reason: 'Switched to video content based on your visual learning preference',
      impact: 42,
      timestamp: new Date('2026-05-12'),
      aiReasoning: 'We noticed your completion time was 2x longer than estimated for text-heavy tasks. Switching the resource type to video tutorials aligned with your Visual Learning Style decreased your completion time and increased engagement.'
    }
  ]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let userId = localStorage.getItem('motivateai_user_id');
        if (!userId) {
          userId = `user_${Math.random().toString(36).substring(2, 15)}`;
          localStorage.setItem('motivateai_user_id', userId);
        }

        const res = await fetch(`/api/user/${userId}/profile`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Your Learning Profile</h1>
        <Link href="/" style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', textDecoration: 'none', color: '#fff' }}>
          Back to Dashboard
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <span className="loader"></span>
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Analyzing your history...</p>
        </div>
      ) : profile ? (
        <div className="space-y-8">
          <BehaviorInsights profile={profile} />
          
          {/* Consistency Trend Chart */}
          <div className="glass-panel mt-12">
            <h3 className="text-xl font-bold text-white mb-4">📈 Consistency Trend</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={consistencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(168, 85, 247, 0.2)" />
                  <XAxis dataKey="date" stroke="#a78bfa" />
                  <YAxis stroke="#a78bfa" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #a78bfa' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    stroke="#ec4899"
                    name="Completion Rate %"
                    dot={{ fill: '#ec4899' }}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="engagement"
                    stroke="#8b5cf6"
                    name="Engagement %"
                    dot={{ fill: '#8b5cf6' }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-emerald-400 mt-4">
              ✓ +32% improvement in 7 days! Your consistency is accelerating.
            </p>
          </div>

          {/* Peak Performance Times */}
          <div className="glass-panel">
            <h3 className="text-xl font-bold text-white mb-4">⏰ Peak Performance Times</h3>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <BarChart data={performanceByTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(168, 85, 247, 0.2)" />
                  <XAxis dataKey="time" stroke="#a78bfa" />
                  <YAxis stroke="#a78bfa" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #a78bfa' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="performance" name="Performance %">
                    {performanceByTime.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.performance > 80 ? '#10b981' : '#8b5cf6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-purple-300 mt-4">
              💡 You perform best at 8-10 AM. Consider scheduling hard tasks then.
            </p>
          </div>

          {/* Task Completion Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel">
              <h3 className="text-xl font-bold text-white mb-4">🎯 Task Difficulty</h3>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Easy', value: 45 },
                        { name: 'Medium', value: 35 },
                        { name: 'Hard', value: 20 }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                      label
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#8b5cf6" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel">
              <h3 className="text-xl font-bold text-white mb-4">📊 Weekly Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-white border-b border-purple-500/20 pb-2">
                  <span>Total Sessions</span>
                  <span className="font-bold text-purple-400">12</span>
                </div>
                <div className="flex justify-between text-white border-b border-purple-500/20 pb-2">
                  <span>Total Hours</span>
                  <span className="font-bold text-purple-400">18.5</span>
                </div>
                <div className="flex justify-between text-white border-b border-purple-500/20 pb-2">
                  <span>Avg Per Session</span>
                  <span className="font-bold text-purple-400">1h 32m</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>Streak Days</span>
                  <span className="font-bold text-emerald-400">7 🔥</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-3xl">🔧</span> How We've Optimized for You
            </h2>
            <div className="grid gap-4">
              {adaptations.map(adaptation => (
                <AdaptationCard key={adaptation.id} adaptation={adaptation} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h2>No Data Yet</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Complete a few sessions to unlock your personalized learning insights!</p>
          <Link href="/" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--accent)', borderRadius: '8px', textDecoration: 'none', color: '#fff' }}>
            Start a Session
          </Link>
        </div>
      )}
    </div>
  );
}
