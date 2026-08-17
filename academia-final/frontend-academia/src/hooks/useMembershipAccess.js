import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { profileService } from '@/services/profileService';

export function useMembershipAccess() {
  const { isAuthenticated, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const refresh = useCallback(() => {
    if (!isAuthenticated) { setProfile(null); return Promise.resolve(null); }
    return profileService.get().then((result) => { setProfile(result); return result; }).catch(() => { setProfile(null); return null; });
  }, [isAuthenticated]);
  useEffect(() => { refresh(); }, [refresh, user?.id]);
  useEffect(() => { window.addEventListener('cabsa:membership-changed', refresh); return () => window.removeEventListener('cabsa:membership-changed', refresh); }, [refresh]);
  const active = profile?.membership?.status === 'ACTIVE';
  const allowed = (section) => isAuthenticated && active && profile?.access?.sections?.[section] === true;
  const resourceAllowed = (type, key) => {
    if (!isAuthenticated) return false;
    if (!active || key === null || key === undefined) return false;
    return profile?.access?.resources?.[type]?.[String(key)] !== false;
  };
  return { profile, active, allowed, resourceAllowed, refresh };
}
