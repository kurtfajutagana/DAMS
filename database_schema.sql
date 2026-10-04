create type public.user_role as enum ('admin', 'receptionist', 'dentist', 'patient');
create type public.appointment_status as enum ('scheduled', 'checked-in', 'completed', 'cancelled');

create table public.branches (
  id uuid not null default gen_random_uuid (),
  branch_name text not null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  constraint branches_pkey primary key (id),
  constraint branches_name_key unique (branch_name)
) TABLESPACE pg_default;

create table public.chatbot_logs (
  id uuid not null default gen_random_uuid (),
  patient_id uuid not null,
  message_prompt text not null,
  ai_response text not null,
  created_at timestamp with time zone null default now(),
  constraint chatbot_logs_pkey primary key (id)
) TABLESPACE pg_default;

create table public.prescriptions (
  id uuid not null default gen_random_uuid (),
  patient_id uuid not null,
  dentist_id uuid not null,
  medication_name text not null,
  dosage_instructions text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  constraint prescriptions_pkey primary key (id)
) TABLESPACE pg_default;

create table public.profiles (
  id uuid not null default gen_random_uuid (),
  role public.user_role not null,
  full_name text not null,
  contact_number text null,
  date_of_birth date null,
  medical_history text null,
  specialization text null,
  license_number text null,
  ptr_number text null,
  emergency_contact_name text null,
  emergency_contact_phone text null,
  preferences jsonb default '{}'::jsonb,
  is_email_verified boolean null default false,
  is_available boolean null default false,
  branch_id uuid null,
  created_at timestamp with time zone null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_branch_id_fkey foreign key (branch_id) references branches(id)
) TABLESPACE pg_default;

create table public.email_verifications (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  email text not null,
  otp_code text not null,
  created_at timestamp with time zone null default now(),
  expires_at timestamp with time zone not null,
  constraint email_verifications_pkey primary key (id)
) TABLESPACE pg_default;

create table public.reminders (
  id uuid not null default gen_random_uuid (),
  prescription_id uuid not null,
  patient_id uuid not null,
  scheduled_time timestamp with time zone not null,
  status public.reminder_status null default 'pending'::reminder_status,
  sent_at timestamp with time zone null,
  constraint reminders_pkey primary key (id),
  constraint reminders_prescription_id_fkey foreign KEY (prescription_id) references prescriptions (id)
) TABLESPACE pg_default;

create table public.treatments (
  id uuid not null default gen_random_uuid (),
  patient_id uuid not null,
  dentist_id uuid not null,
  procedure_name text not null,
  treatment_date date not null,
  clinical_notes text null,
  created_at timestamp with time zone null default now(),
  constraint treatments_pkey primary key (id)
) TABLESPACE pg_default;

create table public.tooth_conditions (
  id uuid not null default gen_random_uuid (),
  patient_id uuid not null,
  tooth_number integer not null,
  status text not null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint tooth_conditions_pkey primary key (id),
  constraint tooth_conditions_unique unique (patient_id, tooth_number)
) TABLESPACE pg_default;

create table public.invoices (
  id uuid not null default gen_random_uuid (),
  patient_id uuid not null,
  treatment_id uuid null,
  procedure_name text not null,
  amount_due numeric not null,
  status text not null default 'pending',
  receipt_url text null,
  payment_method text null,
  created_at timestamp with time zone null default now(),
  constraint invoices_pkey primary key (id),
  constraint invoices_patient_id_fkey foreign key (patient_id) references profiles (id) on delete cascade
) TABLESPACE pg_default;

create table public.treatment_steps (
  id uuid not null default gen_random_uuid (),
  treatment_id uuid not null,
  step_order integer not null,
  title text not null,
  description text null,
  status text not null default 'pending',
  step_date timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  constraint treatment_steps_pkey primary key (id),
  constraint treatment_steps_treatment_id_fkey foreign KEY (treatment_id) references treatments (id) on delete cascade
) TABLESPACE pg_default;

-- Grant API access to the new tables
GRANT ALL ON TABLE public.tooth_conditions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.treatment_steps TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.prescriptions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.invoices TO anon, authenticated, service_role;

-- Allow authenticated users to bypass RLS for clinical tables
CREATE POLICY "Allow authenticated full access" ON public.prescriptions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to invoices" ON public.invoices FOR ALL TO authenticated USING (true);

create table public.dentist_ratings (
  id uuid not null default gen_random_uuid (),
  patient_id uuid not null,
  dentist_id uuid not null,
  appointment_id uuid null,
  rating integer not null check (rating >= 1 and rating <= 5),
  feedback text null,
  created_at timestamp with time zone null default now(),
  constraint dentist_ratings_pkey primary key (id),
  constraint dentist_ratings_patient_id_fkey foreign key (patient_id) references profiles(id) on delete cascade,
  constraint dentist_ratings_dentist_id_fkey foreign key (dentist_id) references profiles(id) on delete cascade
) TABLESPACE pg_default;

GRANT ALL ON TABLE public.dentist_ratings TO anon, authenticated, service_role;
CREATE POLICY "Allow authenticated full access to dentist_ratings" ON public.dentist_ratings FOR ALL TO authenticated USING (true);

create table public.notifications (
  id uuid not null default gen_random_uuid (),
  patient_id uuid not null,
  title text not null,
  message text not null,
  is_read boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint notifications_pkey primary key (id),
  constraint notifications_patient_id_fkey foreign key (patient_id) references profiles(id) on delete cascade
) TABLESPACE pg_default;

GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;
CREATE POLICY "Allow authenticated full access to notifications" ON public.notifications FOR ALL TO authenticated USING (true);

create table public.appointments (
  id uuid not null default gen_random_uuid (),
  patient_id uuid not null,
  dentist_id uuid null,
  branch_id uuid null,
  appointment_date timestamp with time zone not null,
  status text not null default 'pending',
  notes text null,
  branch text null,
  service_requested text null,
  checked_in_at timestamp with time zone null,
  duration_minutes integer not null default 60,
  created_at timestamp with time zone null default now(),
  constraint appointments_pkey primary key (id),
  constraint appointments_patient_id_fkey foreign key (patient_id) references profiles(id) on delete cascade,
  constraint appointments_dentist_id_fkey foreign key (dentist_id) references profiles(id) on delete set null,
  constraint appointments_branch_id_fkey foreign key (branch_id) references branches(id) on delete cascade
) TABLESPACE pg_default;

GRANT ALL ON TABLE public.appointments TO anon, authenticated, service_role;
CREATE POLICY "Allow authenticated full access to appointments" ON public.appointments FOR ALL TO authenticated USING (true);

create table public.dentist_schedules (
  id uuid not null default gen_random_uuid (),
  dentist_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null default '09:00',
  end_time time not null default '17:00',
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  constraint dentist_schedules_pkey primary key (id),
  constraint dentist_day_branch_unique unique (dentist_id, branch_id, day_of_week)
) TABLESPACE pg_default;

GRANT ALL ON TABLE public.dentist_schedules TO anon, authenticated, service_role;
CREATE POLICY "Allow authenticated full access to dentist_schedules" ON public.dentist_schedules FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow anon read dentist_schedules" ON public.dentist_schedules FOR SELECT TO anon USING (true);

create table public.appointment_reschedule_logs (
  id uuid not null default gen_random_uuid (),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  rescheduled_by uuid references public.profiles(id),
  rescheduled_by_role text not null,
  previous_date timestamp with time zone not null,
  new_date timestamp with time zone not null,
  reason text null,
  created_at timestamp with time zone default now(),
  constraint appointment_reschedule_logs_pkey primary key (id)
) TABLESPACE pg_default;

GRANT ALL ON TABLE public.appointment_reschedule_logs TO anon, authenticated, service_role;
CREATE POLICY "Allow authenticated full access to appointment_reschedule_logs" ON public.appointment_reschedule_logs FOR ALL TO authenticated USING (true);

-- ============================================================================
-- PERFORMANCE INDEXES (High-concurrency optimization & fast query lookups)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_id ON public.appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_branch_id ON public.appointments(branch_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON public.appointments(appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_patient_id ON public.reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status_time ON public.reminders(status, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_treatments_patient_id ON public.treatments(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_patient_id ON public.notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_patient_id ON public.chatbot_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ============================================================================
-- DATA PRIVACY ACT COMPLIANCE: ROW-LEVEL SECURITY (RLS) POLICIES
-- Ensures Patient A cannot inspect Patient B's clinical data
-- ============================================================================

-- Helper function to identify clinic staff/dentist/admin roles without recursion
CREATE OR REPLACE FUNCTION public.is_clinic_staff()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'receptionist', 'dentist')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all sensitive clinical tables
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tooth_conditions ENABLE ROW LEVEL SECURITY;

-- Drop legacy permissive policies if they exist
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.prescriptions;
DROP POLICY IF EXISTS "Allow authenticated full access to invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow authenticated full access to appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow authenticated full access to notifications" ON public.notifications;

-- Secure scoped policies: Patients access ONLY their own rows; staff have full operational access
CREATE POLICY "Scoped access to prescriptions" ON public.prescriptions
  FOR ALL TO authenticated
  USING (patient_id = auth.uid() OR public.is_clinic_staff());

CREATE POLICY "Scoped access to invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (patient_id = auth.uid() OR public.is_clinic_staff());

CREATE POLICY "Scoped access to appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (patient_id = auth.uid() OR public.is_clinic_staff());

CREATE POLICY "Scoped access to reminders" ON public.reminders
  FOR ALL TO authenticated
  USING (patient_id = auth.uid() OR public.is_clinic_staff());

CREATE POLICY "Scoped access to notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (patient_id = auth.uid() OR public.is_clinic_staff());

CREATE POLICY "Scoped access to treatments" ON public.treatments
  FOR ALL TO authenticated
  USING (patient_id = auth.uid() OR public.is_clinic_staff());

CREATE POLICY "Scoped access to tooth_conditions" ON public.tooth_conditions
  FOR ALL TO authenticated
  USING (patient_id = auth.uid() OR public.is_clinic_staff());

