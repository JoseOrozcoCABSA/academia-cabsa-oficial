export interface ManagedGroup {
  id: number;
  nombre: string;
  descripcion: string | null;
  seat_limit: number;
  occupied_seats: number;
}

export interface TeacherScholarship {
  vigente_hasta: Date | string | null;
}

export interface SponsorPolicy extends TeacherScholarship {
  sponsor_activation_id: string;
  sponsor_level_id: number;
  dependent_level_id: number;
  sponsor_name: string;
  dependent_name: string;
  dependent_label: string;
  seat_limit: number;
  inherit_expiry: number;
  allow_progress: number;
}
