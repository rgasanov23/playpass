export type UserRole = "ADMIN" | "ORGANIZER" | "PLAYER";

export type AuthUser = {
  id: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LoginResponse = {
  access_token: string;
  user: {
    id: string;
    email: string | null;
    fullName: string;
    role: UserRole;
  };
};

export type RegisterResponse = LoginResponse & {
  user: {
    id: string;
    email: string | null;
    fullName: string;
    role: UserRole;
    createdAt: string;
  };
};
