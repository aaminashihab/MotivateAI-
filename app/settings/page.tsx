"use client";

import React, { useState, useEffect } from 'react';

export default function Settings() {
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    // Notification Settings
    pushNotifications: true,
    emailReminders: true,
    sessionReminders: true,
    dailySummary: true,
    
    // Time Preferences
    timezone: 'UTC',
    preferredSessionTime: 'morning', // morning, afternoon, evening
    minBreakDuration: 5,
    maxSessionDuration: 60,
    
    // Difficulty
    difficultyLevel: 'intermediate', // beginner, intermediate, expert
    
    // Learning Style
    learningStyle: 'visual', // visual, auditory, kinesthetic
    taskComplexity: 'medium', // simple, medium, complex
    
    // Data
    autoDataExport: false,
    dataExportFrequency: 'weekly',
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      let currentUserId = localStorage.getItem('motivateai_user_id');
      if (!currentUserId) {
        currentUserId = `user_${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem('motivateai_user_id', currentUserId);
      }
      setUserId(currentUserId);

      try {
        const res = await fetch(`/api/users/${currentUserId}/preferences`);
        if (res.ok) {
          const data = await res.json();
          if (Object.keys(data).length > 0) {
            setPreferences(prev => ({ ...prev, ...data }));
          }
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <span className="loader"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 pt-24">
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Header */}
        <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
        <p className="text-purple-300 mb-8">Customize your MotivateAI experience</p>

        {/* Success Message */}
        {saved && (
          <div className="bg-green-500/20 border border-green-500 text-green-100 px-4 py-3 rounded-lg mb-6 animate-slide-down">
            ✓ Preferences saved successfully!
          </div>
        )}

        <div className="space-y-6">
          {/* Notification Settings */}
          <div className="glass-panel">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">🔔 Notifications</h2>
            
            <div className="space-y-6">
              <label className="relative flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.pushNotifications}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    pushNotifications: e.target.checked
                  })}
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500 shadow-inner"></div>
                <span className="ml-4 text-white group-hover:text-purple-300 transition font-medium">Push Notifications</span>
              </label>

              <label className="relative flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.sessionReminders}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    sessionReminders: e.target.checked
                  })}
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500 shadow-inner"></div>
                <span className="ml-4 text-white group-hover:text-purple-300 transition font-medium">Session Reminders</span>
              </label>

              <label className="relative flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.dailySummary}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    dailySummary: e.target.checked
                  })}
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500 shadow-inner"></div>
                <span className="ml-4 text-white group-hover:text-purple-300 transition font-medium">Daily Summary Email</span>
              </label>
            </div>
          </div>

          {/* Time Preferences */}
          <div className="glass-panel">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">⏰ Time Preferences</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-purple-300 mb-2 text-sm font-medium">Timezone</label>
                <select
                  value={preferences.timezone}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    timezone: e.target.value
                  })}
                  className="w-full bg-slate-800/80 text-white px-4 py-3 rounded-lg border border-purple-500/20 focus:border-purple-500 outline-none transition"
                >
                  <option>UTC</option>
                  <option>IST (India)</option>
                  <option>EST (US East)</option>
                  <option>PST (US West)</option>
                  <option>GMT (UK)</option>
                </select>
              </div>

              <div>
                <label className="block text-purple-300 mb-2 text-sm font-medium">Preferred Session Time</label>
                <select
                  value={preferences.preferredSessionTime}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    preferredSessionTime: e.target.value
                  })}
                  className="w-full bg-slate-800/80 text-white px-4 py-3 rounded-lg border border-purple-500/20 focus:border-purple-500 outline-none transition"
                >
                  <option value="morning">Morning (6AM - 12PM)</option>
                  <option value="afternoon">Afternoon (12PM - 6PM)</option>
                  <option value="evening">Evening (6PM - 11PM)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-purple-300 mb-2 text-sm font-medium">Min Break (min)</label>
                  <input
                    type="number"
                    value={preferences.minBreakDuration}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      minBreakDuration: parseInt(e.target.value) || 0
                    })}
                    className="w-full bg-slate-800/80 text-white px-4 py-3 rounded-lg border border-purple-500/20 focus:border-purple-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-purple-300 mb-2 text-sm font-medium">Max Session (min)</label>
                  <input
                    type="number"
                    value={preferences.maxSessionDuration}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      maxSessionDuration: parseInt(e.target.value) || 0
                    })}
                    className="w-full bg-slate-800/80 text-white px-4 py-3 rounded-lg border border-purple-500/20 focus:border-purple-500 outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Learning Preferences */}
          <div className="glass-panel">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">🧠 Learning Preferences</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-purple-300 mb-3 text-sm font-medium">Difficulty Level</label>
                <div className="flex flex-wrap gap-3">
                  {['beginner', 'intermediate', 'expert'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setPreferences({
                        ...preferences,
                        difficultyLevel: level
                      })}
                      className={`px-5 py-2.5 rounded-lg capitalize font-medium transition-all ${
                        preferences.difficultyLevel === level
                          ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-slate-800 border border-slate-700 text-purple-300 hover:bg-slate-700 hover:border-purple-500/50'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-purple-300 mb-3 text-sm font-medium">Learning Style</label>
                <div className="flex flex-wrap gap-3">
                  {['visual', 'auditory', 'kinesthetic'].map((style) => (
                    <button
                      key={style}
                      onClick={() => setPreferences({
                        ...preferences,
                        learningStyle: style
                      })}
                      className={`px-5 py-2.5 rounded-lg capitalize font-medium transition-all ${
                        preferences.learningStyle === style
                          ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-slate-800 border border-slate-700 text-purple-300 hover:bg-slate-700 hover:border-purple-500/50'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="glass-panel">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">📊 Data & Privacy</h2>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group mb-6">
                <input
                  type="checkbox"
                  checked={preferences.autoDataExport}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    autoDataExport: e.target.checked
                  })}
                  className="w-5 h-5 accent-purple-500 cursor-pointer"
                />
                <span className="text-white group-hover:text-purple-300 transition">Auto Export Data Weekly</span>
              </label>

              <button className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-4 py-3 rounded-lg border border-blue-500/20 transition flex items-center justify-center gap-2 font-medium">
                ⬇️ Export Data as JSON
              </button>
              
              <button className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-400 px-4 py-3 rounded-lg border border-red-500/20 transition flex items-center justify-center gap-2 font-medium">
                🗑️ Delete All My Data
              </button>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-8 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all transform hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/20 flex justify-center items-center gap-2 text-lg"
          >
            {saving ? '💾 Saving...' : '💾 Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
