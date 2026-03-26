/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  parseISO,
  isSunday,
  getWeek,
  getMonth,
  getYear,
  differenceInMinutes
} from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Users, 
  Calendar as CalendarIcon, 
  Download, 
  Trash2, 
  Edit2, 
  X,
  Clock,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Printer,
  Settings,
  Upload,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Employee, Shift, ShiftTemplate, ServiceDetail } from './types';
import { INITIAL_EMPLOYEES, ITALIAN_HOLIDAYS, INITIAL_TEMPLATES } from './constants';

export default function App() {
  // State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [employeesDate, setEmployeesDate] = useState(new Date());
  const [statsDate, setStatsDate] = useState(new Date());
  
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('sm_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });
  const [shifts, setShifts] = useState<Shift[]>(() => {
    const saved = localStorage.getItem('sm_shifts');
    return saved ? JSON.parse(saved) : [];
  });
  const [templates, setTemplates] = useState<ShiftTemplate[]>(() => {
    const saved = localStorage.getItem('sm_templates');
    return saved ? JSON.parse(saved) : INITIAL_TEMPLATES;
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    return localStorage.getItem('sm_logo_url');
  });
  
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isWeekExportModalOpen, setIsWeekExportModalOpen] = useState(false);
  
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [employeePhoto, setEmployeePhoto] = useState<string | null>(null);
  const [availableColors, setAvailableColors] = useState<string[]>(() => {
    const saved = localStorage.getItem('availableColors');
    return saved ? JSON.parse(saved) : ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  });
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [filterEmployeeIds, setFilterEmployeeIds] = useState<string[]>([]);
  const [view, setView] = useState<'calendar' | 'employees' | 'stats' | 'templates' | 'settings'>('calendar');
  const [serviceDetails, setServiceDetails] = useState<ServiceDetail[]>(() => {
    const saved = localStorage.getItem('sm_service_details');
    return saved ? JSON.parse(saved) : [];
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem('sm_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('sm_shifts', JSON.stringify(shifts));
  }, [shifts]);

  useEffect(() => {
    localStorage.setItem('sm_templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('sm_service_details', JSON.stringify(serviceDetails));
  }, [serviceDetails]);

  useEffect(() => {
    if (logoUrl) {
      localStorage.setItem('sm_logo_url', logoUrl);
    } else {
      localStorage.removeItem('sm_logo_url');
    }
  }, [logoUrl]);

  const handleExportData = () => {
    const data = {
      employees,
      shifts,
      templates,
      serviceDetails,
      logoUrl,
      version: '1.0',
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_planning_${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.employees && data.shifts) {
          setConfirmConfig({
            title: "Conferma Importazione",
            message: "Sei sicuro di voler importare questi dati? Tutti i dati attuali (dipendenti, turni, modelli) verranno sovrascritti con quelli del file selezionato.",
            onConfirm: () => {
              setEmployees(data.employees);
              setShifts(data.shifts);
              if (data.templates) setTemplates(data.templates);
              if (data.serviceDetails) setServiceDetails(data.serviceDetails);
              if (data.logoUrl) {
                setLogoUrl(data.logoUrl);
                localStorage.setItem('sm_logo_url', data.logoUrl);
              }
              setIsConfirmModalOpen(false);
            }
          });
          setIsConfirmModalOpen(true);
        } else {
          console.error("Invalid backup file structure");
        }
      } catch (err) {
        console.error("Error parsing backup file", err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Calendar Helpers
  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const calendarWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    return weeks;
  }, [calendarDays]);

  const activeDate = useMemo(() => {
    if (view === 'calendar') return calendarDate;
    if (view === 'employees') return employeesDate;
    if (view === 'stats') return statsDate;
    return new Date();
  }, [view, calendarDate, employeesDate, statsDate]);

  const handleDateChange = (action: 'next' | 'prev' | 'today') => {
    const setter = view === 'calendar' ? setCalendarDate : 
                   view === 'employees' ? setEmployeesDate : 
                   view === 'stats' ? setStatsDate : null;
    
    if (!setter) return;

    if (action === 'today') {
      setter(new Date());
    } else if (action === 'next') {
      setter(prev => addMonths(prev, 1));
    } else {
      setter(prev => subMonths(prev, 1));
    }
  };

  const nextMonth = () => handleDateChange('next');
  const prevMonth = () => handleDateChange('prev');
  const goToToday = () => handleDateChange('today');

  // Stats Calculations
  const monthlyStatsEmployees = useMemo(() => {
    const stats: Record<string, number> = {};
    shifts.forEach(shift => {
      const shiftDate = parseISO(shift.date);
      if (getMonth(shiftDate) === getMonth(employeesDate) && getYear(shiftDate) === getYear(employeesDate)) {
        stats[shift.employeeId] = (stats[shift.employeeId] || 0) + shift.duration;
      }
    });
    return stats;
  }, [shifts, employeesDate]);

  const weeklyStatsEmployees = useMemo(() => {
    const stats: Record<string, number> = {};
    const currentWeek = getWeek(employeesDate, { weekStartsOn: 1 });
    shifts.forEach(shift => {
      const shiftDate = parseISO(shift.date);
      if (getWeek(shiftDate, { weekStartsOn: 1 }) === currentWeek && getYear(shiftDate) === getYear(employeesDate)) {
        stats[shift.employeeId] = (stats[shift.employeeId] || 0) + shift.duration;
      }
    });
    return stats;
  }, [shifts, employeesDate]);

  const monthlyStatsStats = useMemo(() => {
    const stats: Record<string, number> = {};
    shifts.forEach(shift => {
      const shiftDate = parseISO(shift.date);
      if (getMonth(shiftDate) === getMonth(statsDate) && getYear(shiftDate) === getYear(statsDate)) {
        stats[shift.employeeId] = (stats[shift.employeeId] || 0) + shift.duration;
      }
    });
    return stats;
  }, [shifts, statsDate]);

  useEffect(() => {
    localStorage.setItem('availableColors', JSON.stringify(availableColors));
  }, [availableColors]);

  // Handlers
  const roundUp = (num: number) => Math.ceil(num * 100) / 100;

  const handleAddEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const role = formData.get('role') as string;
    const color = formData.get('color') as string;
    const contractHours = Number(formData.get('contractHours'));

    if (editingEmployee) {
      setEmployees(prev => prev.map(emp => emp.id === editingEmployee.id ? { ...emp, name, role, color, contractHours, photoUrl: employeePhoto || undefined } : emp));
    } else {
      const newEmp: Employee = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        role,
        color,
        contractHours,
        photoUrl: employeePhoto || undefined
      };
      setEmployees(prev => [...prev, newEmp]);
    }
    setIsEmployeeModalOpen(false);
    setEditingEmployee(null);
    setEmployeePhoto(null);
  };

  const handleDeleteEmployee = (id: string) => {
    const emp = employees.find(e => e.id === id);
    setConfirmConfig({
      title: 'Elimina Dipendente',
      message: `Sei sicuro di voler eliminare ${emp?.name}? Questa azione eliminerà anche tutti i suoi turni associati.`,
      onConfirm: () => {
        setEmployees(prev => prev.filter(emp => emp.id !== id));
        setShifts(prev => prev.filter(shift => shift.employeeId !== id));
        setIsConfirmModalOpen(false);
      }
    });
    setIsConfirmModalOpen(true);
  };

  const handleSaveShift = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const description = formData.get('description') as string;

    const start = parseISO(`2000-01-01T${startTime}`);
    const end = parseISO(`2000-01-01T${endTime}`);
    let duration = differenceInMinutes(end, start) / 60;
    if (duration < 0) duration += 24;
    duration = roundUp(duration);

    // Save new service detail if it doesn't exist
    if (description && description.trim()) {
      const exists = serviceDetails.some(sd => sd.text.toLowerCase() === description.trim().toLowerCase());
      if (!exists) {
        setServiceDetails(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), text: description.trim() }]);
      }
    }

    if (editingShift) {
      const employeeId = formData.get('employeeId') as string;
      setShifts(prev => prev.map(s => s.id === editingShift.id ? { ...s, employeeId, date, startTime, endTime, duration, description } : s));
    } else {
      const newShifts: Shift[] = selectedEmployees.map(empId => ({
        id: Math.random().toString(36).substr(2, 9),
        employeeId: empId,
        date,
        startTime,
        endTime,
        duration,
        description
      }));
      setShifts(prev => [...prev, ...newShifts]);
    }
    setIsShiftModalOpen(false);
    setEditingShift(null);
    setSelectedEmployees([]);
  };

  const handleSaveTemplate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const description = formData.get('description') as string;

    // Save new service detail if it doesn't exist
    if (description && description.trim()) {
      const exists = serviceDetails.some(sd => sd.text.toLowerCase() === description.trim().toLowerCase());
      if (!exists) {
        setServiceDetails(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), text: description.trim() }]);
      }
    }

    if (editingTemplate) {
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, name, startTime, endTime, description } : t));
    } else {
      const newTemp: ShiftTemplate = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        startTime,
        endTime,
        description
      };
      setTemplates(prev => [...prev, newTemp]);
    }
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    const template = templates.find(t => t.id === id);
    setConfirmConfig({
      title: 'Elimina Modello',
      message: `Sei sicuro di voler eliminare il modello "${template?.name}"?`,
      onConfirm: () => {
        setTemplates(prev => prev.filter(t => t.id !== id));
        setIsConfirmModalOpen(false);
      }
    });
    setIsConfirmModalOpen(true);
  };

  const handleDeleteServiceDetail = (id: string) => {
    setServiceDetails(prev => prev.filter(sd => sd.id !== id));
  };

  const handleDeleteShift = (id: string) => {
    setConfirmConfig({
      title: 'Elimina Turno',
      message: 'Sei sicuro di voler eliminare questo turno?',
      onConfirm: () => {
        setShifts(prev => prev.filter(s => s.id !== id));
        setIsConfirmModalOpen(false);
      }
    });
    setIsConfirmModalOpen(true);
  };

  const exportToCSV = () => {
    const headers = ['Dipendente', 'Data', 'Inizio', 'Fine', 'Durata (h)'];
    const rows = shifts
      .filter(s => {
        const d = parseISO(s.date);
        return getMonth(d) === getMonth(activeDate) && getYear(d) === getYear(activeDate);
      })
      .map(s => {
        const emp = employees.find(e => e.id === s.employeeId);
        return [emp?.name || 'Sconosciuto', s.date, s.startTime, s.endTime, roundUp(s.duration).toString()];
      });

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `turni_${format(activeDate, 'MMMM_yyyy', { locale: it })}.csv`;
    link.click();
  };

  const exportWeeklySchedule = (weekStart: Date) => {
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 1 })
    });

    const headers = ['Dipendente', ...weekDays.map(d => format(d, 'EEEE dd/MM', { locale: it }))];
    const rows = employees.map(emp => {
      const row = [emp.name];
      weekDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayShifts = shifts.filter(s => s.employeeId === emp.id && s.date === dateStr);
        if (dayShifts.length > 0) {
          row.push(dayShifts.map(s => {
            const template = templates.find(t => t.startTime === s.startTime && t.endTime === s.endTime);
            const label = template ? template.name : `${s.startTime}-${s.endTime}`;
            return s.description ? `${label} (${s.description})` : label;
          }).join(' / '));
        } else {
          row.push('-');
        }
      });
      return row;
    });

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `planning_settimanale_${format(weekStart, 'dd_MM_yyyy')}.csv`;
    link.click();
    setIsWeekExportModalOpen(false);
  };

  const printWeeklySchedule = (weekStart: Date) => {
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 1 })
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Per favore abilita i popup per stampare il planning.');
      return;
    }

    const content = `
      <html>
        <head>
          <title>Planning Settimanale - ${format(weekStart, 'dd/MM/yyyy')}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1a1a1a; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; font-size: 11px; }
            th { background-color: #f9fafb; font-weight: bold; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
            h1 { color: #2563eb; margin: 0; font-size: 24px; }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; }
            .date-range { font-weight: 600; color: #4b5563; }
            .emp-name { font-weight: bold; color: #111827; }
            .shift-time { color: #2563eb; font-weight: 500; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Planning Settimanale</h1>
              <div class="date-range">Dal ${format(weekStart, 'dd MMMM', { locale: it })} al ${format(weekDays[6], 'dd MMMM yyyy', { locale: it })}</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #9ca3af;">
              Generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 150px;">Dipendente</th>
                ${weekDays.map(d => `<th>${format(d, 'EEEE', { locale: it })}<br>${format(d, 'dd/MM')}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${employees.map(emp => `
                <tr>
                  <td class="emp-name">${emp.name}</td>
                  ${weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayShifts = shifts.filter(s => s.employeeId === emp.id && s.date === dateStr);
                    return `<td>${dayShifts.length > 0 ? dayShifts.map(s => {
                      const template = templates.find(t => t.startTime === s.startTime && t.endTime === s.endTime);
                      const label = template ? template.name : `${s.startTime}-${s.endTime}`;
                      const display = s.description ? `${label} <small>(${s.description})</small>` : label;
                      return `<span class="shift-time">${display}</span>`;
                    }).join('<br>') : '-'}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    setIsWeekExportModalOpen(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Sidebar Navigation */}
      <nav className="fixed left-0 top-0 h-full w-20 bg-white border-r border-gray-200 flex flex-col items-center py-8 gap-8 z-50">
        <div className="relative group">
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover shadow-sm border border-gray-100" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
                S
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit2 size={10} className="text-gray-500" />
            </div>
          </label>
        </div>
        <button 
          onClick={() => setView('calendar')}
          className={cn(
            "p-3 rounded-xl transition-all",
            view === 'calendar' ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <CalendarIcon size={24} />
        </button>
        <button 
          onClick={() => setView('employees')}
          className={cn(
            "p-3 rounded-xl transition-all",
            view === 'employees' ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <Users size={24} />
        </button>
        <button 
          onClick={() => setView('stats')}
          className={cn(
            "p-3 rounded-xl transition-all",
            view === 'stats' ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <BarChart3 size={24} />
        </button>
        <button 
          onClick={() => setView('templates')}
          className={cn(
            "p-3 rounded-xl transition-all",
            view === 'templates' ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <Clock size={24} />
        </button>
        <button 
          onClick={() => setView('settings')}
          className={cn(
            "p-3 rounded-xl transition-all",
            view === 'settings' ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <Settings size={24} />
        </button>
      </nav>

      {/* Main Content */}
      <main className="pl-20 min-h-screen">
        <header className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-40">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
                {view === 'calendar' && "Calendario Turni"}
                {view === 'employees' && "Gestione Personale"}
                {view === 'stats' && "Analisi Ore e Straordinari"}
                {view === 'templates' && "Configurazione Modelli"}
                {view === 'settings' && "Impostazioni e Backup"}
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">
                {view === 'settings' ? "Gestione dati e sistema" : format(activeDate, 'MMMM yyyy', { locale: it }).toUpperCase()}
              </p>
            </div>
            
            {(view === 'calendar' || view === 'employees' || view === 'stats') && (
              <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                <button 
                  onClick={goToToday}
                  className="px-2 py-1 text-[10px] font-bold bg-white text-blue-600 rounded shadow-sm hover:bg-blue-50 transition-all uppercase tracking-wider"
                >
                  Oggi
                </button>
                <div className="flex items-center">
                  <button onClick={prevMonth} className="p-1.5 hover:bg-white rounded-md transition-all text-gray-600"><ChevronLeft size={18}/></button>
                  <button onClick={nextMonth} className="p-1.5 hover:bg-white rounded-md transition-all text-gray-600"><ChevronRight size={18}/></button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {view === 'calendar' && (
              <>
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-xs font-semibold">
                    <Users size={14} />
                    {filterEmployeeIds.length === 0 ? 'TUTTI I DIPENDENTI' : `${filterEmployeeIds.length} SELEZIONATI`}
                  </button>
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] p-2">
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      <button 
                        onClick={() => setFilterEmployeeIds([])}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Resetta Filtri
                      </button>
                      {employees.map(emp => (
                        <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            checked={filterEmployeeIds.includes(emp.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilterEmployeeIds(prev => [...prev, emp.id]);
                              } else {
                                setFilterEmployeeIds(prev => prev.filter(id => id !== emp.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: emp.color }} />
                          <span className="text-sm font-medium text-gray-700">{emp.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsWeekExportModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors text-xs font-semibold"
                  title="Scarica il planning settimanale per i dipendenti"
                >
                  <Download size={14} />
                  SCARICA PLANNING
                </button>
                <button 
                  onClick={() => {
                    setEditingShift(null);
                    setSelectedDate(new Date());
                    setIsShiftModalOpen(true);
                  }}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-xs font-semibold shadow-sm"
                >
                  <Plus size={16} />
                  NUOVO TURNO
                </button>
              </>
            )}
            {view === 'employees' && (
              <button 
                onClick={() => {
                  setEditingEmployee(null);
                  setEmployeePhoto(null);
                  setIsEmployeeModalOpen(true);
                }}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-xs font-semibold shadow-sm"
              >
                <Plus size={16} />
                AGGIUNGI DIPENDENTE
              </button>
            )}
            {view === 'templates' && (
              <button 
                onClick={() => {
                  setEditingTemplate(null);
                  setIsTemplateModalOpen(true);
                }}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-xs font-semibold shadow-sm"
              >
                <Plus size={16} />
                AGGIUNGI MODELLO
              </button>
            )}
          </div>
        </header>

        <div className="p-8">
          {view === 'calendar' && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 border-b border-gray-200">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                  <div key={day} className="py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 auto-rows-fr">
                {calendarDays.map((day, idx) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayShifts = shifts.filter(s => 
                    s.date === dateStr && 
                    (filterEmployeeIds.length === 0 || filterEmployeeIds.includes(s.employeeId))
                  );
                  const holiday = ITALIAN_HOLIDAYS.find(h => h.date === dateStr);
                  const isSun = isSunday(day);
                  const isCurrentMonth = isSameMonth(day, monthStart);

                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "min-h-[160px] p-2 border-r border-b border-gray-100 flex flex-col gap-1 transition-colors",
                        !isCurrentMonth && "bg-gray-50/50 opacity-40",
                        (isSun || holiday) && isCurrentMonth && "bg-red-50/30"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={cn(
                          "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full",
                          isSameDay(day, new Date()) ? "bg-blue-600 text-white" : "text-gray-700",
                          (isSun || holiday) && !isSameDay(day, new Date()) && "text-red-600"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {holiday && (
                          <span className="text-[10px] font-bold text-red-500 uppercase truncate max-w-[60px]">
                            {holiday.name}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {templates.map(template => {
                          const templateShifts = dayShifts.filter(s => 
                            s.startTime === template.startTime && s.endTime === template.endTime
                          );
                          
                          return (
                            <div key={template.id} className="flex flex-col gap-1">
                              <div className="flex items-center justify-between group/temp">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                  {template.name}
                                </span>
                                <button 
                                  onClick={() => {
                                    setSelectedDate(day);
                                    setEditingShift(null);
                                    setSelectedEmployees([]);
                                    setIsShiftModalOpen(true);
                                    // Pre-select template in the next tick or via state
                                    setTimeout(() => {
                                      const select = document.querySelector('select[name="templateSelect"]') as HTMLSelectElement;
                                      if (select) {
                                        select.value = template.id;
                                        select.dispatchEvent(new Event('change', { bubbles: true }));
                                      }
                                    }, 0);
                                  }}
                                  className="p-0.5 hover:bg-gray-100 rounded text-gray-400 transition-all"
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {templateShifts.map(shift => {
                                  const emp = employees.find(e => e.id === shift.employeeId);
                                  return (
                                    <div key={shift.id} className="relative group/tooltip">
                                      <button
                                        onClick={() => {
                                          setEditingShift(shift);
                                          setIsShiftModalOpen(true);
                                        }}
                                        className="px-1.5 py-0.5 rounded text-[10px] font-bold transition-all hover:brightness-90 truncate max-w-full"
                                        style={{ backgroundColor: emp?.color, color: 'white' }}
                                      >
                                        {emp?.name.split(' ')[0]}
                                      </button>
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block z-[70] pointer-events-none">
                                        <div className="bg-gray-900 text-white text-[10px] py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap border border-gray-700">
                                          <p className="font-bold">{emp?.name}</p>
                                          <p className="opacity-80 flex items-center gap-1 mt-0.5">
                                            <Clock size={10} />
                                            {shift.startTime} - {shift.endTime}
                                          </p>
                                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Extra shifts not matching any template */}
                        {dayShifts.filter(s => !templates.some(t => t.startTime === s.startTime && t.endTime === s.endTime)).length > 0 && (
                          <div className="flex flex-col gap-1 pt-1 border-t border-gray-50">
                            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">Altri</span>
                            <div className="flex flex-wrap gap-1">
                              {dayShifts.filter(s => !templates.some(t => t.startTime === s.startTime && t.endTime === s.endTime)).map(shift => {
                                const emp = employees.find(e => e.id === shift.employeeId);
                                return (
                                  <div key={shift.id} className="relative group/tooltip">
                                    <button
                                      onClick={() => {
                                        setEditingShift(shift);
                                        setIsShiftModalOpen(true);
                                      }}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-bold transition-all hover:brightness-90 truncate max-w-full border border-gray-200"
                                      style={{ color: emp?.color }}
                                    >
                                      {emp?.name.split(' ')[0]}
                                    </button>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block z-[70] pointer-events-none">
                                      <div className="bg-gray-900 text-white text-[10px] py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap border border-gray-700">
                                        <p className="font-bold">{emp?.name}</p>
                                        <p className="opacity-80 flex items-center gap-1 mt-0.5">
                                          <Clock size={10} />
                                          {shift.startTime} - {shift.endTime}
                                        </p>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => {
                          setSelectedDate(day);
                          setEditingShift(null);
                          setIsShiftModalOpen(true);
                        }}
                        className="mt-auto hover:bg-gray-100 p-1 rounded text-gray-400 self-center transition-all"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'employees' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employees.map(emp => (
                <motion.div 
                  layout
                  key={emp.id} 
                  className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl overflow-hidden"
                        style={{ backgroundColor: emp.color }}
                      >
                        {emp.photoUrl ? (
                          <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover" />
                        ) : (
                          emp.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{emp.name}</h3>
                        <p className="text-sm text-gray-500">{emp.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          setEditingEmployee(emp);
                          setEmployeePhoto(emp.photoUrl || null);
                          setIsEmployeeModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Settimanali</p>
                      <p className="text-xl font-semibold text-gray-700">{roundUp(weeklyStatsEmployees[emp.id] || 0)}h</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Mensili</p>
                      <p className="text-xl font-semibold text-gray-700">{roundUp(monthlyStatsEmployees[emp.id] || 0)}h</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {view === 'stats' && (
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <BarChart3 className="text-blue-600" />
                  Riepilogo Mensile Ore e Straordinari
                </h2>
                <div className="space-y-8">
                  {employees.map(emp => {
                    const hours = monthlyStatsStats[emp.id] || 0;
                    const contract = emp.contractHours || 160;
                    const overtime = Math.max(0, hours - contract);
                    const percentage = Math.min((hours / contract) * 100, 100);
                    
                    return (
                      <div key={emp.id} className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="font-semibold text-gray-800 text-lg">{emp.name}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{emp.role}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400 font-medium">Totale: <span className="text-gray-800 font-semibold">{roundUp(hours)}h</span> / {contract}h</p>
                            {overtime > 0 && (
                              <p className="text-sm text-red-600 font-bold flex items-center justify-end gap-1">
                                <AlertCircle size={14} />
                                Straordinari: +{roundUp(overtime)}h
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: emp.color }}
                          />
                          {overtime > 0 && (
                            <div className="absolute top-0 right-0 h-full w-[2px] bg-red-500 z-10" style={{ left: '100%' }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {view === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(temp => (
                <motion.div 
                  layout
                  key={temp.id} 
                  className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{temp.name}</h3>
                      {temp.description && (
                        <p className="text-sm text-gray-500 italic mb-1">{temp.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-gray-500 mt-1">
                        <Clock size={16} />
                        <span className="text-sm font-medium">{temp.startTime} - {temp.endTime}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          setEditingTemplate(temp);
                          setIsTemplateModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteTemplate(temp.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {view === 'settings' && (
            <div className="p-8 max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Backup & Restore Card */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Database size={20} />
                    </div>
                    <h2 className="text-lg font-semibold">Backup e Ripristino</h2>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                    I tuoi dati sono salvati localmente in questo browser. Esporta un backup per sicurezza o per trasferire i dati su un altro dispositivo.
                  </p>

                  <div className="space-y-4">
                    <button 
                      onClick={handleExportData}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                      <Download size={18} />
                      Esporta Backup (JSON)
                    </button>

                    <label className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 text-gray-600 rounded-xl font-semibold hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer">
                      <Upload size={18} />
                      Importa Backup
                      <input 
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        onChange={handleImportData}
                      />
                    </label>
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gray-50 text-gray-600 rounded-lg">
                      <AlertCircle size={20} />
                    </div>
                    <h2 className="text-lg font-semibold">Informazioni Sistema</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Versione App</span>
                      <span className="text-sm font-semibold">1.0.0</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Modalità</span>
                      <span className="text-sm font-semibold text-green-600">Client-Side (Local)</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Dipendenti salvati</span>
                      <span className="text-sm font-semibold">{employees.length}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Turni totali</span>
                      <span className="text-sm font-semibold">{shifts.length}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-xs text-amber-700 leading-relaxed">
                      <strong>Nota:</strong> In questa modalità, i dati non vengono inviati a nessun server. Se cancelli la cronologia del browser, i dati potrebbero andare persi. Usa regolarmente la funzione di backup.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Week Export Modal */}
      <AnimatePresence>
        {isWeekExportModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-lg font-semibold">Esporta Settimana</h2>
                <button onClick={() => setIsWeekExportModalOpen(false)} className="p-2 bg-white text-gray-400 hover:text-gray-600 rounded-full border border-gray-100 shadow-sm transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-2">
                <p className="text-xs text-gray-500 mb-2 uppercase font-bold tracking-wider">Scegli la settimana:</p>
                {calendarWeeks.map((week, idx) => {
                  const start = week[0];
                  const end = week[6];
                  return (
                    <div
                      key={idx}
                      className="w-full p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left flex items-center justify-between group"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-700">Settimana {idx + 1}</span>
                        <span className="text-xs text-gray-500">
                          Dal {format(start, 'dd/MM')} al {format(end, 'dd/MM')}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => printWeeklySchedule(start)}
                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors flex items-center gap-1 text-xs font-bold"
                          title="Visualizza e Stampa (PDF)"
                        >
                          <Printer size={16} />
                          STAMPA
                        </button>
                        <button 
                          onClick={() => exportWeeklySchedule(start)}
                          className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 text-xs font-bold"
                          title="Scarica CSV"
                        >
                          <Download size={16} />
                          CSV
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Template Modal */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-[340px] shadow-2xl overflow-hidden"
            >
              <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-sm font-semibold">{editingTemplate ? 'Modifica Modello' : 'Nuovo Modello'}</h2>
                <button onClick={() => setIsTemplateModalOpen(false)} className="p-1 bg-white text-gray-400 hover:text-gray-600 rounded-full border border-gray-100 shadow-sm transition-all"><X size={16}/></button>
              </div>
              <form onSubmit={handleSaveTemplate} className="p-3 space-y-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wider">Nome Modello</label>
                  <input 
                    name="name" 
                    defaultValue={editingTemplate?.name}
                    required 
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="E.g. Mattina"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wider">Descrizione Predefinita</label>
                  <input 
                    name="description" 
                    defaultValue={editingTemplate?.description}
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all mb-1.5"
                    placeholder="E.g. Emergenza 118"
                  />
                  {serviceDetails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 bg-gray-50 rounded-lg border border-gray-100">
                      {serviceDetails.map(sd => (
                        <div key={sd.id} className="flex items-center gap-1 bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-sm group">
                          <button
                            type="button"
                            onClick={(e) => {
                              const form = (e.currentTarget.closest('form') as HTMLFormElement);
                              if (form) {
                                (form.elements.namedItem('description') as HTMLInputElement).value = sd.text;
                              }
                            }}
                            className="text-[9px] font-bold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wider"
                          >
                            {sd.text}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteServiceDetail(sd.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <X size={8} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wider">Inizio</label>
                      <input 
                        type="time" 
                        name="startTime" 
                        defaultValue={editingTemplate?.startTime || '09:00'}
                        required 
                        className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wider">Fine</label>
                      <input 
                        type="time" 
                        name="endTime" 
                        defaultValue={editingTemplate?.endTime || '17:00'}
                        required 
                        className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                <button className="w-full bg-blue-600 text-white py-2 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mt-1 text-sm">
                  {editingTemplate ? 'Salva Modifiche' : 'Crea Modello'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {isConfirmModalOpen && confirmConfig && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertCircle size={24} />
                <h3 className="text-lg font-semibold">{confirmConfig.title}</h3>
              </div>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                {confirmConfig.message}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button 
                  onClick={confirmConfig.onConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
                >
                  Elimina
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isEmployeeModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-[340px] shadow-2xl overflow-hidden"
            >
              <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-sm font-semibold">{editingEmployee ? 'Modifica Dipendente' : 'Nuovo Dipendente'}</h2>
                <button onClick={() => setIsEmployeeModalOpen(false)} className="p-1 bg-white text-gray-400 hover:text-gray-600 rounded-full border border-gray-100 shadow-sm transition-all"><X size={16}/></button>
              </div>
              <form onSubmit={handleAddEmployee} className="p-3 space-y-2">
                <div className="flex flex-col items-center gap-3 mb-2">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl overflow-hidden shadow-inner border-2 border-gray-100"
                    style={{ backgroundColor: editingEmployee?.color || '#3b82f6' }}
                  >
                    {employeePhoto ? (
                      <img src={employeePhoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      editingEmployee?.name.charAt(0) || '?'
                    )}
                  </div>
                  <label className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1 uppercase tracking-wider">
                    <Upload size={12} />
                    {employeePhoto ? 'Cambia Foto' : 'Carica Foto'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setEmployeePhoto(ev.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wider">Nome Completo</label>
                  <input 
                    name="name" 
                    defaultValue={editingEmployee?.name}
                    required 
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="E.g. Mario Rossi"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wider">Ruolo</label>
                  <input 
                    name="role" 
                    defaultValue={editingEmployee?.role}
                    required 
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="E.g. Manager"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wider">Ore Contrattuali Mensili</label>
                  <input 
                    type="number"
                    name="contractHours" 
                    defaultValue={editingEmployee?.contractHours || 160}
                    required 
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="E.g. 160"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wider">Colore Identificativo</label>
                  <div className="flex flex-wrap gap-2.5">
                    {availableColors.map(c => (
                      <label key={c} className="relative cursor-pointer">
                        <input type="radio" name="color" value={c} defaultChecked={editingEmployee?.color === c || (!editingEmployee && c === availableColors[0])} className="sr-only peer" />
                        <div className="w-7 h-7 rounded-full border-2 border-transparent peer-checked:border-gray-800 transition-all shadow-sm" style={{ backgroundColor: c }} />
                      </label>
                    ))}
                    <label className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-all text-gray-400 hover:text-blue-500">
                      <Plus size={14} />
                      <input 
                        type="color" 
                        className="sr-only" 
                        onChange={(e) => {
                          const newColor = e.target.value;
                          if (!availableColors.includes(newColor)) {
                            setAvailableColors(prev => [...prev, newColor]);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <button className="w-full bg-blue-600 text-white py-2 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mt-2 text-sm">
                  {editingEmployee ? 'Salva Modifiche' : 'Crea Profilo'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shift Modal */}
      <AnimatePresence>
        {isShiftModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-[340px] shadow-2xl overflow-hidden"
            >
              <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-sm font-semibold">{editingShift ? 'Modifica Turno' : 'Nuovo Turno'}</h2>
                <div className="flex gap-2 items-center">
                  {editingShift && (
                    <button 
                      onClick={() => {
                        handleDeleteShift(editingShift.id);
                        setIsShiftModalOpen(false);
                      }}
                      className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button onClick={() => setIsShiftModalOpen(false)} className="p-1 bg-white text-gray-400 hover:text-gray-600 rounded-full border border-gray-100 shadow-sm transition-all"><X size={16}/></button>
                </div>
              </div>
              <form onSubmit={handleSaveShift} className="p-3 space-y-2">
                {!editingShift && (
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wider">Modello Turno</label>
                    <select 
                      name="templateSelect"
                      onChange={(e) => {
                        const template = templates.find(t => t.id === e.target.value);
                        if (template) {
                          const form = e.target.form;
                          if (form) {
                            (form.elements.namedItem('startTime') as HTMLInputElement).value = template.startTime;
                            (form.elements.namedItem('endTime') as HTMLInputElement).value = template.endTime;
                            if (template.description) {
                              (form.elements.namedItem('description') as HTMLInputElement).value = template.description;
                            }
                          }
                        }
                      }}
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="">Seleziona un modello...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.startTime}-{t.endTime})</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wider">Dipendente/i</label>
                  {editingShift ? (
                    <select 
                      name="employeeId" 
                      defaultValue={editingShift?.employeeId}
                      required 
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto p-1.5 border border-gray-100 rounded-lg bg-gray-50/50">
                      {employees.map(e => (
                        <label key={e.id} className="flex items-center gap-1.5 p-1 hover:bg-white rounded cursor-pointer transition-all border border-transparent hover:border-gray-200">
                          <input 
                            type="checkbox" 
                            checked={selectedEmployees.includes(e.id)}
                            onChange={(ev) => {
                              if (ev.target.checked) {
                                setSelectedEmployees(prev => [...prev, e.id]);
                              } else {
                                setSelectedEmployees(prev => prev.filter(id => id !== e.id));
                              }
                            }}
                            className="w-3 h-3 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-[11px] font-medium truncate">{e.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wider">Data</label>
                  <input 
                    type="date" 
                    name="date" 
                    defaultValue={editingShift?.date || (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '')}
                    required 
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wider">Inizio</label>
                    <input 
                      type="time" 
                      name="startTime" 
                      defaultValue={editingShift?.startTime || '09:00'}
                      required 
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wider">Fine</label>
                    <input 
                      type="time" 
                      name="endTime" 
                      defaultValue={editingShift?.endTime || '17:00'}
                      required 
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wider">Descrizione Turno</label>
                  <input 
                    name="description" 
                    defaultValue={editingShift?.description}
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all mb-1"
                    placeholder="E.g. Emergenza 118"
                  />
                  {serviceDetails.length > 0 && (
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-1.5 bg-gray-50 rounded-lg border border-gray-100">
                      {serviceDetails.map(sd => (
                        <div key={sd.id} className="flex items-center gap-1 bg-white border border-gray-200 px-1 py-0.5 rounded shadow-sm group">
                          <button
                            type="button"
                            onClick={(e) => {
                              const form = (e.currentTarget.closest('form') as HTMLFormElement);
                              if (form) {
                                (form.elements.namedItem('description') as HTMLInputElement).value = sd.text;
                              }
                            }}
                            className="text-[8px] font-bold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wider"
                          >
                            {sd.text}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteServiceDetail(sd.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <X size={7} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button className="w-full bg-blue-600 text-white py-2 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mt-1 text-sm">
                  {editingShift ? 'Salva Modifiche' : 'Crea Turno'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
