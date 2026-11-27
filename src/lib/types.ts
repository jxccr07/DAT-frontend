export type CourseStatus = "passed" | "current_course" | "failed" | "deleted_course" | "not_studied";

export interface Me {
  id: number;
  student_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  study_year: number | null;
  role: "student" | "advisor";
  unread_messages: number;
  academic_plan: { id: number; name: string; program: string; college: string; major: string } | null;
}

export interface SemesterRef {
  id: number;
  name: string;
  academic_year: string;
  semester: "first" | "second" | "summer";
  starts_at: string;
  ends_at: string;
}

export interface GradedCourse {
  id: number;
  status: "passed" | "failed";
  grade: number;
  letter: string;
  points: number;
  quality_points: number;
  course: { id: number; code: string; name: string; hours: number } | null;
}

export interface Grades {
  summary: {
    cumulative_gpa: number | null;
    current_gpa: number | null;
    passed_hours: number;
    courses_count: number;
  };
  terms: { semester: SemesterRef | null; semester_gpa: number | null; hours: number; courses: GradedCourse[] }[];
}

export interface PlanCourse {
  index: number;
  id: number;
  code: string;
  name: string;
  description: string | null;
  hours: number;
  has_lab: boolean;
  suggested_semester: number;
  status: CourseStatus;
  is_passed: boolean;
}

export interface Plan {
  plan: { id: number; name: string; description: string | null; program: string; college: string; major: string };
  summary: {
    plan_hours: number;
    passed_hours: number;
    plan_courses_count: number;
    passed_courses_count: number;
    is_completed: boolean;
  };
  semesters: { number: number; title: string; hours: number; is_completed: boolean; courses: PlanCourse[] }[];
}

export interface ScheduleEntry {
  record_id: number;
  course_id: number;
  code: string;
  name: string;
  hours: number;
  day_index: number;
  time: string;
  is_lab: boolean;
  room_code: string;
  section: string;
}

export interface Schedule {
  semester: (SemesterRef & { id: number }) | null;
  summary: { courses_count: number; total_hours: number; study_days_count: number };
  schedule_entries: ScheduleEntry[];
}

export interface RegistrationCourse {
  id: number;
  code: string;
  name: string;
  hours: number;
  has_lab: boolean;
  level: number;
  is_retake: boolean;
  is_recommended: boolean;
  twin?: TwinCourse | null;
}

export interface RegisteredCourse {
  record_id: number;
  id: number;
  code: string;
  name: string;
  hours: number;
  has_lab: boolean;
  twin?: TwinCourse | null;
}

export interface Registration {
  semester: { id: number; name: string; academic_year: string; registration_starts_at: string | null; registration_ends_at: string | null } | null;
  window_open: boolean;
  limits: { max_hours: number; min_hours: number };
  registered_hours: number;
  registered: RegisteredCourse[];
  available: RegistrationCourse[];
}

/* --------------------------------- twin ---------------------------------- */

export type GpaBand = "new" | "g1" | "g2" | "g3" | "g4" | "g5";
export type Lane = "on" | "slight" | "behind";
export type Phase = "early" | "mid" | "late";

/** "Students like you" figures for one course (band "all" = every student, used when your band is too small). */
export interface TwinCourse {
  band: GpaBand | "all";
  n_taken: number;
  pass_rate: number;
  typical_letter: string | null;
  n_dropped: number;
  n_kept: number;
  delayed_if_dropped: number | null;
  delayed_if_kept: number | null;
}

/** Outcome two terms later for similar students who made the decision vs those who didn't. */
export interface TwinComparison {
  n_with: number;
  delayed_with: number;
  gap_with: number;
  n_without: number;
  delayed_without: number;
  gap_without: number;
}

export interface TwinCourseRef {
  id: number;
  code: string;
  name: string;
  hours: number;
}

export type TwinAlternative =
  | { type: "keep"; pass_rate: number; typical_letter: string | null }
  | { type: "drop_instead"; course: TwinCourseRef; delayed: number }
  | {
      type: "add_course";
      course: TwinCourseRef;
      pass_rate: number | null;
      is_retake: boolean;
      hours_after_adding: number;
      reaches_min: boolean;
      shortfall_after: number;
    };

export interface TwinDecision {
  action: "drop" | "light" | "fail";
  course: TwinCourseRef | null;
  cohort: { phase: Phase; term_no: number; gpa_band: GpaBand; gpa_range: [number, number] | null; lane: Lane; gap_hours: number };
  comparison: TwinComparison | null;
  course_stats: TwinCourse | null;
  hours_after: number;
  min_hours: number;
  light_after: TwinComparison | null;
  alternatives: TwinAlternative[];
  delayed_gap_hours: number;
  horizon_terms: number;
  struggling: boolean;
  will_notify_advisor: boolean;
  has_advisor: boolean;
  headline: TwinHeadline | null;
}

/** The one comparison the drop dialog leads with: this exact course, or (labelled) any drop. */
export interface TwinHeadline {
  source: "course" | "general";
  n_with: number;
  n_without: number;
  delayed_with: number;
  delayed_without: number;
  /** 95% Wilson interval for each share: how precise the sample allows us to be. */
  range_with?: [number, number] | null;
  range_without?: [number, number] | null;
}

export type TwinReason =
  | { code: "behind_plan"; hours: number }
  | { code: "failed_pending"; count: number }
  | { code: "light_load"; hours: number; min: number }
  | { code: "low_gpa"; gpa: number };

/** A habit that clearly set apart the students who caught up, in the same cohort. */
export interface WhatWorked {
  code: "no_drop" | "no_fail" | "full_load";
  on_time: number;
  delayed: number;
  n_on_time: number;
}

/** The system's own measured effect. */
export interface TwinImpact {
  views: number;
  kept: number;
  dropped: number;
  kept_rate: number | null;
  by_impact: Partial<Record<"small" | "medium" | "large", { views: number; kept: number }>>;
  alerts: number;
  alerts_contacted: number;
}

export interface TwinStatus {
  ready: boolean;
  profile?: {
    term_no: number;
    phase: Phase;
    gpa: number | null;
    gpa_band: GpaBand;
    gpa_range: [number, number] | null;
    lane: Lane;
    gap_hours: number;
    passed_hours: number;
    expected_hours: number;
    plan_hours: number;
    remaining_hours: number;
    plan_terms_left: number;
    registered_hours: number;
  };
  cohort?: { n: number; delayed: number; gap: number; what_worked: WhatWorked[] } | null;
  projection?: { terms_needed: number; plan_terms_left: number; delay_terms: number; assumed_load: number };
  reasons?: TwinReason[];
  action?: "recovery_plan" | "reach_min_load" | "retake_failed" | "add_course" | "keep_going";
  fail_impact?: TwinComparison | null;
}

/** Inputs for the "what if" road to graduation (the arithmetic runs in the browser). */
export interface TwinTimeline {
  term_no: number;
  remaining_hours: number;
  plan_terms_left: number;
  registered_hours: number;
  registered: (TwinCourseRef & { stats: TwinCourse | null })[];
  limits: { min_hours: number; max_hours: number; summer_max_hours: number };
  /** terms[0] is the current term, terms[k] is k main terms from now. */
  terms: { academic_year: string; semester: "first" | "second" | "summer" }[];
  cohort: { n: number; delayed: number } | null;
  evidence: { drop: TwinComparison | null; light: TwinComparison | null; fail: TwinComparison | null };
  horizon_terms: number;
}

export interface TwinScores {
  students_scored: number;
  base_rate: number | null;
  auc: number | null;
  /** 95% interval (Hanley-McNeil). */
  auc_ci?: [number, number] | null;
  brier?: number | null;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  calibration: { range: [number, number]; n: number; predicted: number; actual: number }[];
}

export interface TwinBacktest extends TwinScores {
  baseline?: Pick<TwinScores, "auc" | "auc_ci" | "brier" | "accuracy" | "precision" | "recall">;
  /** Out-of-time check: trained on outcomes known by `train_up_to_semester`, scored on `test_semester`. */
  temporal?: (TwinScores & { available?: boolean; reason?: "single_cohort" | null; train_up_to_semester: number; test_semester: number }) | null;
}

export interface TwinMeta {
  built_at: string;
  build_seconds: number;
  sample_limit: number | null;
  students: number;
  terms: number;
  records: number;
  snapshots: number;
  delayed_gap_hours: number;
  horizon_terms: number;
  light_load_below: number;
  min_cohort: number;
  backtest: TwinBacktest;
  impact?: TwinImpact;
}

/* ------------------------------- advising -------------------------------- */

export interface AdvisorAlert {
  id: number;
  type: "costly_drop" | "meeting_request";
  student: { id: number; full_name: string; student_id: string };
  course: { code: string; name: string } | null;
  details: {
    extra_hours: number;
    delayed_with: number | null;
    delayed_without: number | null;
    n_with: number | null;
    course_delayed_if_dropped: number | null;
    course_delayed_if_kept: number | null;
    hours_after: number;
    min_hours: number;
    below_min: boolean;
    headline?: TwinHeadline | null;
  } | null;
  seen_at: string | null;
  created_at: string;
}

export interface Message {
  id: number;
  sender: "advisor" | "student";
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface MessageThread {
  advisor: { full_name: string; email: string | null; department: string | null } | null;
  messages: Message[];
}

export type PriorityReason =
  | { code: "reply"; count: number }
  | { code: "alert"; count: number }
  | { code: "below_min"; hours: number; min: number }
  | { code: "failed"; count: number }
  | { code: "behind"; hours: number };

export interface AdvisorPriority {
  id: number;
  student_id: string;
  full_name: string;
  gpa: number | null;
  risk: number | null;
  reasons: PriorityReason[];
}

export interface AdvisorOverview {
  advisor: { full_name: string; department: string | null; college: string | null };
  counts: { students: number; high_risk: number; critical: number; behind: number; unseen_alerts: number };
  alerts: AdvisorAlert[];
  priorities: AdvisorPriority[];
  impact: TwinImpact;
  week: { alerts: number; contacted: number; views: number; kept: number };
  unread_replies: { id: number; full_name: string; count: number; last_at: string }[];
  high_risk_threshold: number;
}

export type DeadlineReason =
  | { code: "requested" }
  | { code: "drop_cost"; a: number; b: number; n: number }
  | { code: "below_min"; hours: number; min: number }
  | { code: "fail_rate"; p: number }
  | { code: "failed"; count: number };

/** "Talk to them before the drop deadline": a day's worth of students, each with the reason. */
export interface DeadlineList {
  deadline: string | null;
  days_left: number | null;
  daily_cap: number;
  quiet_days: number;
  total: number;
  students: {
    id: number;
    student_id: string;
    full_name: string;
    gpa: number | null;
    course: TwinCourseRef | null;
    requested: boolean;
    reasons: DeadlineReason[];
  }[];
}

export interface AdvisorStudentRow {
  id: number;
  student_id: string;
  full_name: string;
  term_no: number | null;
  gpa: number | null;
  lane: Lane | null;
  gap_hours: number | null;
  failed_pending: number | null;
  registered_hours: number | null;
  risk: number | null;
  tier: "critical" | "high" | "mid" | "low" | "none";
  unseen_alerts: number;
  last_contact_at: string | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
}

export interface AdvisorStudentFile {
  student: { id: number; student_id: string; full_name: string; email: string; phone_number: string; study_year: number | null; major: string | null };
  twin: TwinStatus;
  alerts: AdvisorAlert[];
  messages: Message[];
  notes: { id: number; body: string; contacted: boolean | number; created_at: string }[];
}

/** Result shape returned by Server Actions to the client. */
export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; code: string };
