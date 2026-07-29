export type Role = "STUDENT" | "STUDIO_OWNER" | "INSTRUCTOR" | "ADMIN";

export const SIGNUP_ROLES = ["STUDENT", "STUDIO_OWNER", "INSTRUCTOR"] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "Dancer",
  STUDIO_OWNER: "Studio Owner",
  INSTRUCTOR: "Independent Instructor",
  ADMIN: "Administrator",
};

export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/discover",
  STUDIO_OWNER: "/studio",
  INSTRUCTOR: "/teach",
  ADMIN: "/admin",
};

/** Roles that can host classes and therefore need a payout account. */
export const HOST_ROLES: Role[] = ["STUDIO_OWNER", "INSTRUCTOR"];

export function isHost(role: Role) {
  return HOST_ROLES.includes(role);
}

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

/** Booking lifecycle states, mirrored from the schema comments. */
export const BOOKING_STATUS = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  BOOKED: "BOOKED",
  ATTENDED: "ATTENDED",
  CANCELLED: "CANCELLED",
  WAITLISTED: "WAITLISTED",
} as const;
