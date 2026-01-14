import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfWeek, isSameDay, parseISO, isAfter, isBefore, addMinutes, setHours, setMinutes } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Check,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMeetingSettings } from '@/hooks/useMeetingSettings';

interface BookedSlot {
  date: Date;
  duration: number;
  status: string;
}

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
  available: boolean;
  isBooked: boolean;
}

interface MeetingCalendarProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  duration: number;
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string) => void;
}

export function MeetingCalendar({
  selectedDate,
  selectedTime,
  duration,
  onDateSelect,
  onTimeSelect
}: MeetingCalendarProps) {
  const { settings, loading: settingsLoading, getDaysOff, isHoliday, isWorkingDay } = useMeetingSettings();
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    if (now.getHours() >= 17) {
      return startOfWeek(addDays(now, 1), { weekStartsOn: 0 });
    }
    return startOfWeek(now, { weekStartsOn: 0 });
  });
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookedSlots();

    // Subscribe to realtime changes for meetings
    const channel = supabase
      .channel('meeting-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_requests'
        },
        () => {
          console.log('Meeting bookings updated, refreshing...');
          fetchBookedSlots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWeekStart]);

  const fetchBookedSlots = async () => {
    try {
      const startDate = currentWeekStart;
      const endDate = addDays(currentWeekStart, 35);

      const { data, error } = await supabase
        .from('meeting_requests')
        .select('confirmed_date, preferred_date, duration_minutes, status')
        .in('status', ['confirmed', 'pending'])
        .gte('preferred_date', startDate.toISOString())
        .lte('preferred_date', endDate.toISOString());

      if (error) throw error;

      const slots = (data || []).map(meeting => ({
        date: parseISO(meeting.confirmed_date || meeting.preferred_date),
        duration: meeting.duration_minutes,
        status: meeting.status
      }));

      setBookedSlots(slots);
    } catch (error) {
      console.error('Error fetching booked slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const weeks = useMemo(() => {
    const weeksArray = [];
    for (let w = 0; w < 3; w++) {
      const weekStart = addDays(currentWeekStart, w * 7);
      const days = [];
      for (let d = 0; d < 7; d++) {
        const day = addDays(weekStart, d);
        days.push(day);
      }
      weeksArray.push(days);
    }
    return weeksArray;
  }, [currentWeekStart]);

  const isDateAvailable = (date: Date): boolean => {
    const now = new Date();
    // Can't book in the past
    if (isBefore(date, now) && !isSameDay(date, now)) return false;
    // Can't book on days off (from settings)
    if (!isWorkingDay(date)) return false;
    // Can't book on holidays
    if (isHoliday(date)) return false;
    return true;
  };

  const getDateStatus = (date: Date): 'available' | 'partial' | 'booked' | 'unavailable' | 'holiday' => {
    if (isHoliday(date)) return 'holiday';
    if (!isDateAvailable(date)) return 'unavailable';
    
    const dayBookings = bookedSlots.filter(slot => isSameDay(slot.date, date));
    
    if (dayBookings.length === 0) return 'available';
    
    // Calculate available slots for the day using settings
    const workHours = settings.workEndHour - settings.workStartHour;
    const breakHours = settings.breakEndHour - settings.breakStartHour;
    const totalSlots = ((workHours - breakHours) * 60) / settings.slotDuration;
    
    if (dayBookings.length >= totalSlots * 0.8) return 'booked';
    return 'partial';
  };

  const generateTimeSlots = (date: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const now = new Date();
    
    for (let hour = settings.workStartHour; hour < settings.workEndHour; hour++) {
      // Skip lunch break
      if (hour >= settings.breakStartHour && hour < settings.breakEndHour) continue;
      
      for (let minute = 0; minute < 60; minute += settings.slotDuration) {
        const slotTime = setMinutes(setHours(date, hour), minute);
        
        // Skip if slot is in the past
        if (isSameDay(date, now) && isBefore(slotTime, now)) continue;
        
        // Check if slot conflicts with any booking
        const isBooked = bookedSlots.some(booking => {
          const bookingEnd = addMinutes(booking.date, booking.duration);
          const slotEnd = addMinutes(slotTime, duration);
          
          return (
            (isAfter(slotTime, booking.date) || isSameDay(slotTime, booking.date)) &&
            isBefore(slotTime, bookingEnd)
          ) || (
            isAfter(slotEnd, booking.date) &&
            (isBefore(slotEnd, bookingEnd) || isSameDay(slotEnd, bookingEnd))
          ) || (
            isSameDay(slotTime, booking.date) &&
            slotTime.getHours() === booking.date.getHours() &&
            slotTime.getMinutes() === booking.date.getMinutes()
          );
        });

        // Check if the meeting duration would exceed working hours
        const meetingEnd = addMinutes(slotTime, duration);
        const workdayEnd = setMinutes(setHours(date, settings.workEndHour), 0);
        const exceedsWorkday = isAfter(meetingEnd, workdayEnd);

        // Check if meeting would overlap with lunch break
        const lunchStart = setMinutes(setHours(date, settings.breakStartHour), 0);
        const lunchEnd = setMinutes(setHours(date, settings.breakEndHour), 0);
        const overlapsLunch = (
          (isAfter(slotTime, lunchStart) || isSameDay(slotTime, lunchStart)) &&
          isBefore(slotTime, lunchEnd)
        ) || (
          isAfter(meetingEnd, lunchStart) &&
          isBefore(slotTime, lunchStart)
        );

        slots.push({
          time: format(slotTime, 'HH:mm'),
          hour,
          minute,
          available: !isBooked && !exceedsWorkday && !overlapsLunch,
          isBooked
        });
      }
    }
    
    return slots;
  };

  const timeSlots = selectedDate ? generateTimeSlots(selectedDate) : [];
  const availableSlots = timeSlots.filter(s => s.available).length;

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => 
      direction === 'next' 
        ? addDays(prev, 7) 
        : addDays(prev, -7)
    );
  };

  const canGoBack = isAfter(currentWeekStart, new Date());

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-3 text-muted-foreground">جاري تحميل إعدادات المواعيد...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">اختر التاريخ المناسب</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('prev')}
            disabled={!canGoBack}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2">
            {format(currentWeekStart, 'MMMM yyyy', { locale: ar })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('next')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>متاح</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>بعض الأوقات متاحة</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>محجوز بالكامل</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span>غير متاح</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-2">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {week.map((day, dayIndex) => {
              const status = getDateStatus(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const holiday = settings.holidays.find(h => h.date === format(day, 'yyyy-MM-dd'));
              
              return (
                <button
                  key={dayIndex}
                  onClick={() => status !== 'unavailable' && status !== 'booked' && status !== 'holiday' && onDateSelect(day)}
                  disabled={status === 'unavailable' || status === 'booked' || status === 'holiday'}
                  title={holiday?.name}
                  className={cn(
                    "relative p-3 rounded-lg border-2 transition-all text-center",
                    "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                    isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20",
                    !isSelected && status === 'available' && "border-green-200 bg-green-50 hover:bg-green-100",
                    !isSelected && status === 'partial' && "border-yellow-200 bg-yellow-50 hover:bg-yellow-100",
                    status === 'booked' && "border-red-200 bg-red-50 cursor-not-allowed opacity-60",
                    status === 'holiday' && "border-orange-200 bg-orange-50 cursor-not-allowed opacity-70",
                    status === 'unavailable' && "border-gray-200 bg-gray-100 cursor-not-allowed opacity-50",
                    isToday && "ring-2 ring-blue-400/50"
                  )}
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {format(day, 'EEE', { locale: ar })}
                  </div>
                  <div className={cn(
                    "text-lg font-semibold",
                    isSelected && "text-primary",
                    status === 'unavailable' && "text-gray-400",
                    status === 'holiday' && "text-orange-600"
                  )}>
                    {format(day, 'd')}
                  </div>
                  
                  {/* Status indicator */}
                  <div className="absolute top-1 left-1">
                    {status === 'available' && <div className="w-2 h-2 rounded-full bg-green-500" />}
                    {status === 'partial' && <div className="w-2 h-2 rounded-full bg-yellow-500" />}
                    {status === 'booked' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                    {status === 'holiday' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                  </div>

                  {isSelected && (
                    <div className="absolute -top-1 -right-1">
                      <Check className="h-4 w-4 text-primary bg-background rounded-full" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              اختر الوقت المناسب
            </h3>
            <Badge variant="outline" className="gap-1">
              {availableSlots} وقت متاح
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            {format(selectedDate, 'EEEE d MMMM yyyy', { locale: ar })}
          </p>

          {timeSlots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد أوقات متاحة في هذا اليوم</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {timeSlots.map((slot) => {
                const isSelected = selectedTime === slot.time;
                
                return (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && onTimeSelect(slot.time)}
                    disabled={!slot.available}
                    className={cn(
                      "py-2.5 px-3 rounded-lg border text-sm font-medium transition-all",
                      "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                      isSelected && "border-primary bg-primary text-primary-foreground",
                      !isSelected && slot.available && "border-border bg-background hover:bg-muted",
                      !slot.available && "border-red-200 bg-red-50 text-red-400 cursor-not-allowed line-through"
                    )}
                  >
                    {slot.time}
                    {slot.isBooked && !isSelected && (
                      <X className="inline h-3 w-3 mr-1 text-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Working hours info */}
          <div className="text-xs text-muted-foreground flex items-center gap-4 pt-2">
            <span>ساعات العمل: {settings.workStartHour}:00 - {settings.workEndHour}:00</span>
            <span>استراحة: {settings.breakStartHour}:00 - {settings.breakEndHour}:00</span>
          </div>
        </div>
      )}
    </div>
  );
}
