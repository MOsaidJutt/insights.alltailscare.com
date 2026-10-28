// Event names exactly as the AllTails app sends them to Firebase.
// GA cuts names at 40 characters, so some matches below use prefixes.

export type Step = { label: string; screen: string; events?: string[]; prefixes?: string[] };

export const SIGNUP_COMPLETED = [
  "auth_register_apple_completed",
  "auth_register_google_completed",
  "auth_register_email_completed",
];

// Onboarding funnel in screen order, taken from the founder's screenshots (Oct 2026 build).
// OB_question_5's screen still needs confirming with the developer.
export const ONBOARDING_FUNNEL: Step[] = [
  { label: "Opened the app", screen: "First launch", events: ["first_open"] },
  { label: "Splash screen", screen: "AllTails logo", events: ["splash_screen"] },
  { label: "Welcome", screen: "“Caring for your pet just got easier”", events: ["welcome_screen"] },
  { label: "Pet type", screen: "“Who are we caring for?”", events: ["OB_question_1"] },
  { label: "Gender", screen: "“Is [pet] male or female?”", events: ["OB_question_2"] },
  { label: "Age", screen: "“How old is [pet]?”", events: ["OB_question_3"] },
  { label: "Photo", screen: "“Add a photo of [pet]”", events: ["OB_question_4"] },
  { label: "Question 5", screen: "Screen to confirm with the developer", events: ["OB_question_5"] },
  { label: "Breed", screen: "“What breed is [pet]?”", events: ["pet_breed"] },
  { label: "Spayed", screen: "“Is [pet] spayed?”", events: ["pet_sprayed"] },
  { label: "Help with", screen: "“What do you want help with?”", events: ["pet_help"] },
  { label: "Personalising", screen: "Loading the personal plan", events: ["persoalized_loading"] },
  { label: "Care summary", screen: "“Handle all of [pet]’s care, easily”", events: ["pet_care"] },
  { label: "Paywall", screen: "“Manage & share [pet]’s care”", events: ["paywall_viewed_onboarding"] },
  { label: "Created an account", screen: "Google, Apple or email sign-up", events: SIGNUP_COMPLETED },
  { label: "Reached home", screen: "Used Home or the bottom menu (includes people who logged in)", prefixes: ["home_", "bottom_nav_"] },
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
