import { Employee, Shift, ShiftTemplate } from './types';

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Mario Rossi', role: 'Manager', color: '#3b82f6', contractHours: 160 },
  { id: '2', name: 'Luigi Bianchi', role: 'Sales', color: '#10b981', contractHours: 120 },
  { id: '3', name: 'Anna Verdi', role: 'Support', color: '#f59e0b', contractHours: 140 },
];

export const INITIAL_TEMPLATES: ShiftTemplate[] = [
  { id: 't1', name: 'Mattina', startTime: '08:00', endTime: '14:00', description: 'Emergenza 118' },
  { id: 't2', name: 'Pomeriggio', startTime: '14:00', endTime: '20:00', description: 'Servizi Sociali' },
  { id: 't3', name: 'Notte', startTime: '22:00', endTime: '06:00', description: 'Guardia Medica' },
  { id: 't4', name: 'Giornata Intera', startTime: '09:00', endTime: '18:00', description: 'Amministrazione' },
];

export const ITALIAN_HOLIDAYS = [
  { date: '2026-01-01', name: 'Capodanno' },
  { date: '2026-01-06', name: 'Epifania' },
  { date: '2026-04-05', name: 'Pasqua' },
  { date: '2026-04-06', name: 'Lunedì dell\'Angelo' },
  { date: '2026-04-25', name: 'Liberazione' },
  { date: '2026-05-01', name: 'Festa del Lavoro' },
  { date: '2026-06-02', name: 'Festa della Repubblica' },
  { date: '2026-08-15', name: 'Ferragosto' },
  { date: '2026-11-01', name: 'Ognissanti' },
  { date: '2026-12-08', name: 'Immacolata Concezione' },
  { date: '2026-12-25', name: 'Natale' },
  { date: '2026-12-26', name: 'Santo Stefano' },
];
