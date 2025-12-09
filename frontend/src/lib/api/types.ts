/**
 * API Response Types - matches backend schemas
 */

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface UserUpdate {
  name?: string;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface RefreshResponse {
  access_token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface MessageResponse {
  message: string;
}

// Project types
export type ProjectRole = "owner" | "admin" | "member";

export interface ProjectMember {
  user_id: string;
  email: string;
  name: string;
  role: ProjectRole;
  joined_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  members: ProjectMember[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
}

// Member types
export interface MemberInvite {
  email: string;
  role: ProjectRole;
}

export interface MemberRoleUpdate {
  role: ProjectRole;
}

export interface Invitation {
  id: string;
  project_id: string;
  project_name: string;
  email: string;
  role: ProjectRole;
  invited_by: string;
  invited_by_name: string;
  token: string;
  expires_at: string;
  status: "pending" | "accepted" | "expired";
  created_at: string;
}

// API Key types
export type ApiKeyType = "public" | "secret";

export interface ApiKey {
  id: string;
  project_id: string;
  name: string;
  key_prefix: string;
  key_type: ApiKeyType;
  created_by: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiKeyCreate {
  name: string;
  key_type: ApiKeyType;
}

export interface ApiKeyCreated extends ApiKey {
  key: string; // Full key, only shown once
}

export interface ApiKeyListResponse {
  items: ApiKey[];
  total: number;
}

// API Error
export interface ApiError {
  detail: string;
}

