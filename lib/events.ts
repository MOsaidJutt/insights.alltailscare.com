// Event names exactly as the AllTails app sends them to Firebase.
// GA cuts names at 40 characters, so some matches below use prefixes.

export type Step = { label: string; events: string[] };

export const SIGNUP_COMPLETED = [
  "auth_register_apple_completed",
  "auth_register_google_completed",
  "auth_register_email_completed",
];

// Onboarding funnel as described by the founder:
// install > open > onboarding steps > paywall > create user.
// TODO: add the "First Open" step after sign-up once the founder confirms what it means.
export const ONBOARDING_FUNNEL: Step[] = [
  { label: "Opened the app", events: ["first_open"] },
  { label: "Splash screen", events: ["splash_screen"] },
  { label: "Welcome screen", events: ["welcome_screen"] },
  { label: "Question 1", events: ["OB_question_1"] },
  { label: "Question 2", events: ["OB_question_2"] },
  { label: "Question 3", events: ["OB_question_3"] },
  { label: "Question 4", events: ["OB_question_4"] },
  { label: "Question 5", events: ["OB_question_5"] },
  { label: "Pet details", events: ["pet_breed"] },
  { label: "Personalising screen", events: ["persoalized_loading"] },
  { label: "Saw the paywall", events: ["paywall_viewed_onboarding"] },
  { label: "Created an account", events: SIGNUP_COMPLETED },
];

// `key` is a fragment that survives the 40-character cut in every event for that placement.
export const PAYWALL_PLACEMENTS = [
  { label: "Onboarding", view: "paywall_viewed_onboarding", key: "onboard" },
  { label: "Inside the app", view: "paywall_viewed_in_app", key: "in_app" },
  { label: "Second pet", view: "paywall_viewed_home_second_pet", key: "home_sec" },
  { label: "Family invite", view: "paywall_viewed_family_invite", key: "family_i" },
  { label: "Pet limit", view: "paywall_viewed_pet_limit", key: "pet_limi" },
];

export const SIGNUP_METHODS = [
  { label: "Apple", key: "apple" },
  { label: "Google", key: "google" },
  { label: "Email", key: "email" },
];

export type Feature = { label: string; prefix?: string; events?: string[] };

export const FEATURES: Feature[] = [
  { label: "Created a care task", prefix: "task_created" },
  { label: "Logged health data", prefix: "health_log_" },
  { label: "Generated a health report", events: ["health_report_generated"] },
  { label: "Added photos or documents", events: ["home_action_add_media"] },
  { label: "Invited family", events: ["home_action_invite_family"] },
  { label: "Tried to add another pet", events: ["home_add_pet_tapped", "home_add_pet_blocked_tapped"] },
];

export const NAV_TABS: Record<string, string> = {
  bottom_nav_home_tapped: "Home",
  bottom_nav_pets_tapped: "Pets",
  bottom_nav_health_tapped: "Health",
  bottom_nav_tasks_tapped: "Tasks",
  bottom_nav_calendar_tapped: "Calendar",
};
