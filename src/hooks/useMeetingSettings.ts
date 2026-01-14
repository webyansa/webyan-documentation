import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WorkingDay {
  day: number;
  name: string;
  isActive: boolean;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface MeetingSettings {
  workStartHour: number;
  workEndHour: number;
  breakStartHour: number;
  breakEndHour: number;
  slotDuration: number;
  workingDays: WorkingDay[];
  holidays: Holiday[];
}

const DEFAULT_SETTINGS: MeetingSettings = {
  workStartHour: 9,
  workEndHour: 17,
  breakStartHour: 12,
  breakEndHour: 13,
  slotDuration: 30,
  workingDays: [
    { day: 0, name: 'الأحد', isActive: true },
    { day: 1, name: 'الإثنين', isActive: true },
    { day: 2, name: 'الثلاثاء', isActive: true },
    { day: 3, name: 'الأربعاء', isActive: true },
    { day: 4, name: 'الخميس', isActive: true },
    { day: 5, name: 'الجمعة', isActive: false },
    { day: 6, name: 'السبت', isActive: false },
  ],
  holidays: []
};

export function useMeetingSettings() {
  const [settings, setSettings] = useState<MeetingSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'meeting_settings')
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        const parsed = JSON.parse(data.value);
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          workingDays: parsed.workingDays || DEFAULT_SETTINGS.workingDays,
          holidays: parsed.holidays || []
        });
      }
    } catch (err) {
      console.error('Error fetching meeting settings:', err);
      setError('حدث خطأ في تحميل إعدادات الاجتماعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('meeting-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.meeting_settings'
        },
        (payload) => {
          console.log('Meeting settings updated:', payload);
          if (payload.new && 'value' in payload.new) {
            try {
              const parsed = JSON.parse(payload.new.value as string);
              setSettings({
                ...DEFAULT_SETTINGS,
                ...parsed,
                workingDays: parsed.workingDays || DEFAULT_SETTINGS.workingDays,
                holidays: parsed.holidays || []
              });
            } catch (err) {
              console.error('Error parsing updated settings:', err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper functions
  const getDaysOff = (): number[] => {
    return settings.workingDays
      .filter(d => !d.isActive)
      .map(d => d.day);
  };

  const isHoliday = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    return settings.holidays.some(h => h.date === dateStr);
  };

  const isWorkingDay = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    const workingDay = settings.workingDays.find(d => d.day === dayOfWeek);
    return workingDay?.isActive ?? false;
  };

  return {
    settings,
    loading,
    error,
    getDaysOff,
    isHoliday,
    isWorkingDay,
    refetch: fetchSettings
  };
}
