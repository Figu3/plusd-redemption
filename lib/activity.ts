export type Activity = {
  id: string;
  timestamp: number;
  type: 'approve' | 'redeem';
  mode: 'instant' | 'standard';
  amount: string;
  hash: string;
  status: 'pending' | 'success' | 'failed';
};

const ACTIVITY_KEY = 'plusd_redemption_activity';
const MAX_ACTIVITIES = 5;

export function saveActivity(activity: Omit<Activity, 'id' | 'timestamp'>): Activity {
  if (typeof window === 'undefined') return { ...activity, id: '', timestamp: 0 };

  const newActivity: Activity = {
    ...activity,
    id: Math.random().toString(36).substring(2, 15),
    timestamp: Date.now(),
  };

  try {
    const stored = localStorage.getItem(ACTIVITY_KEY);
    const activities: Activity[] = stored ? JSON.parse(stored) : [];
    activities.unshift(newActivity);

    // Keep only last 5 activities
    const trimmed = activities.slice(0, MAX_ACTIVITIES);
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save activity:', err);
  }

  return newActivity;
}

export function getActivities(): Activity[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(ACTIVITY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('Failed to load activities:', err);
    return [];
  }
}

export function updateActivityStatus(id: string, status: Activity['status']) {
  if (typeof window === 'undefined') return;

  try {
    const activities = getActivities();
    const updated = activities.map(a => a.id === id ? { ...a, status } : a);
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update activity:', err);
  }
}
