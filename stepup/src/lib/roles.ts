export type Role = "STUDENT" | "STUDIO_OWNER" | "INSTRUCTOR";

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "Dancer",
  STUDIO_OWNER: "Studio Owner",
  INSTRUCTOR: "Independent Instructor",
};

export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/discover",
  STUDIO_OWNER: "/studio",
  INSTRUCTOR: "/teach",
};

export const DANCE_LEVELS = [
  "ALL_LEVELS",
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
] as const;

export const LEVEL_LABEL: Record<(typeof DANCE_LEVELS)[number], string> = {
  ALL_LEVELS: "All Levels",
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export const CLASS_FORMATS = ["IN_PERSON", "ONLINE"] as const;
