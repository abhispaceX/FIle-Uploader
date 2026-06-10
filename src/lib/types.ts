export type Role = "viewer" | "editor";
export type AccessLevel = "owner" | Role | "none";

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  created_at?: string;
}

export interface DocumentRow {
  id: string;
  owner_id: string;
  title: string;
  content_json: unknown;
  created_at: string;
  updated_at: string;
}

export interface ShareRow {
  document_id: string;
  user_id: string;
  role: Role;
  created_at?: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  owner_id: string;
  owner_name: string;
  updated_at: string;
  access: AccessLevel;
}
