// Shared types for API interactions
// These mirror the Prisma schema shapes but without Prisma-specific fields.

export type Memory = {
  id: string;
  title: string;
  place: string;
  date: string;
  year: string;
  lng: number;
  lat: number;
  color: string;
  kind: string;
  image: string;       // /api/media/… URL or colour hex
  media: string[];     // array of /api/media/… URLs
  favorite: boolean;
  description?: string | null;
  note?: string | null;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type MemoryThread = {
  id: string;
  memoryIds: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type Collection = {
  id: string;
  name: string;
  memoryIds: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type Profile = {
  id: string;
  name: string;
  avatarPath: string | null;
  updatedAt?: string;
};
