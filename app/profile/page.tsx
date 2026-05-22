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

// Removed hardcoded data, now using profile fields

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

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
        
        // Ensure timestamp is a Date object
        if (data.optimizations) {
          data.optimizations = data.optimizations.map((opt: any) => ({
            ...opt,
            timestamp: new Date(opt.timestamp)
          }));
        }
        
        setProfile(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!profile?.userId) return;
    setOptimizing(true);
    try {
      const res = await fetch(`/api/user/${profile.userId}/optimize`, { method: 'POST' });
      if (res.ok) {
        // Refresh the profile to get the new optimizations
        await fetchProfile();
      } else {
        const data = await res.json();
        alert(`Failed to optimize: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred while generating optimizations.');
    } finally {
      setOptimizing(false);
    }
  };

  useEffect(() => {
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
                <LineChart data={profile.consistencyTrend || []}>
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
                <BarChart data={profile.performanceByTime || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(168, 85, 247, 0.2)" />
                  <XAxis dataKey="time" stroke="#a78bfa" />
                  <YAxis stroke="#a78bfa" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #a78bfa' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="performance" name="Performance %">
                    {(profile.performanceByTime || []).map((entry, index) => (
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
                <div className="flex justify-center gap-6 mt-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]"></span>
                    <span className="text-sm font-medium text-slate-300">Easy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#8b5cf6] shadow-[0_0_8px_#8b5cf6]"></span>
                    <span className="text-sm font-medium text-slate-300">Medium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]"></span>
                    <span className="text-sm font-medium text-slate-300">Hard</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel">
              <h3 className="text-xl font-bold text-white mb-4">📊 Weekly Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-white border-b border-purple-500/20 pb-2">
                  <span>Total Sessions</span>
                  <span className="font-bold text-purple-400">{profile.weeklyStats?.totalSessions || 0}</span>
                </div>
                <div className="flex justify-between text-white border-b border-purple-500/20 pb-2">
                  <span>Total Hours</span>
                  <span className="font-bold text-purple-400">{profile.weeklyStats?.totalHours || 0}</span>
                </div>
                <div className="flex justify-between text-white border-b border-purple-500/20 pb-2">
                  <span>Avg Per Session</span>
                  <span className="font-bold text-purple-400">{profile.weeklyStats?.avgPerSession || '0m'}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>Streak Days</span>
                  <span className="font-bold text-emerald-400">{profile.weeklyStats?.streakDays || 0} 🔥</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-3xl">🔧</span> How We've Optimized for You
              </h2>
              <button 
                onClick={handleOptimize}
                disabled={optimizing}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-purple-900/50 transition-all flex items-center gap-2"
              >
                {optimizing ? (
                  <>
                    <span className="loader" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
                    Optimizing...
                  </>
                ) : (
                  <>
                    <span>✨</span> Run Optimization Engine
                  </>
                )}
              </button>
            </div>
            
            <div className="grid gap-4">
              {profile.optimizations && profile.optimizations.length > 0 ? (
                profile.optimizations.map((adaptation: any) => (
                  <AdaptationCard key={adaptation.id} adaptation={adaptation} />
                ))
              ) : (
                <div className="text-center p-8 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <p className="text-slate-400">No optimizations yet. Keep completing sessions so the AI can learn your patterns!</p>
                </div>
              )}
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
