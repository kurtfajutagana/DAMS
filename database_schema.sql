create table public.appointments (
  id uuid not null default gen_random_uuid (),
  patient_id uuid not null,
  dentist_id uuid not null,
  appointment_date timestamp with time zone not null,
  status public.appointment_status null default 'scheduled'::appointment_status,
  notes text null,
  created_at timestamp with time zone null default now(),
  constraint appointments_pkey primary key (id)
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
  created_at timestamp with time zone null default now(),
  constraint profiles_pkey primary key (id)
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
