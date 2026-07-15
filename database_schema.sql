create type public.user_role as enum ('admin', 'receptionist', 'dentist', 'patient');
create type public.appointment_status as enum ('scheduled', 'checked-in', 'completed', 'cancelled');

create table public.appointments (
  id uuid not null default gen_random_uuid (),
  patient_id uuid not null,
  dentist_id uuid null,
  appointment_date timestamp with time zone not null,
  branch text null,
  service_requested text null,
  status text null default 'scheduled',
  notes text null,
  created_at timestamp with time zone null default now(),
  constraint appointments_pkey primary key (id)
) TABLESPACE pg_default;

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
  is_email_verified boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint profiles_pkey primary key (id)
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
