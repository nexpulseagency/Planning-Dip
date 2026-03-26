export interface Employee {
  id: string;
  name: string;
  role: string;
  color: string;
  contractHours: number; // Monthly contract hours
  photoUrl?: string;
}

export interface Shift {
  id: string;
  employeeId: string;
  date: string; // ISO string YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  duration: number; // hours
  description?: string;
  note?: string;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface Holiday {
  date: string;
  name: string;
}

export interface ServiceDetail {
  id: string;
  text: string;
}
