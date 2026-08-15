// src/types/admin.ts
export interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: {
    code: string;
    name: string;
  };
}
