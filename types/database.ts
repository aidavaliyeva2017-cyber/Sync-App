// TypeScript interfaces matching the Sync database schema

export interface Profile {
  id: string; // UUID, FK → auth.users.id
  full_name: string;
  username: string; // unique, lowercase, no spaces
  avatar_url: string | null;
  age: number; // >= 16
  city: string;
  country: string;
  major: string;
  university: string | null;
  interests: [string, string, string]; // exactly 3
  projects: string | null;
  linkedin_url: string | null;
  connect_preference: 'in-person' | 'online' | 'both';
  is_verified: boolean;
  verification_email: string | null;
  expo_push_token: string | null;
  onboarding_complete: boolean;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface Connection {
  id: string; // UUID
  user_a: string; // UUID, FK → profiles.id (alphabetically first)
  user_b: string; // UUID, FK → profiles.id
  created_at: string; // timestamptz
}

export type ConnectionRequestStatus = 'pending' | 'accepted' | 'declined';

export interface ConnectionRequest {
  id: string; // UUID
  sender_id: string; // UUID, FK → profiles.id
  receiver_id: string; // UUID, FK → profiles.id
  intro_note: string | null; // max 200 chars
  status: ConnectionRequestStatus;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface Message {
  id: string; // UUID
  connection_id: string; // UUID, FK → connections.id
  sender_id: string; // UUID, FK → profiles.id
  content: string; // max 2000 chars
  created_at: string; // timestamptz
}

export interface MessageReadStatus {
  id: string; // UUID
  connection_id: string; // UUID, FK → connections.id
  user_id: string; // UUID, FK → profiles.id
  last_read_at: string; // timestamptz
}

export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'new_message'
  | 'new_match';

export interface Notification {
  id: string; // UUID
  user_id: string; // UUID, FK → profiles.id
  type: NotificationType;
  title: string;
  body: string;
  reference_id: string | null; // UUID, related entity
  is_read: boolean;
  created_at: string; // timestamptz
}

export interface MatchSuggestion {
  id: string; // UUID
  user_id: string; // UUID, FK → profiles.id
  suggested_user_id: string; // UUID, FK → profiles.id
  score: number; // 0–1
  reason: string | null;
  shown_at: string; // date (CURRENT_DATE)
  was_acted_on: boolean;
  created_at: string; // timestamptz
}

// Joined / derived types used in the app
export interface ConversationPreview {
  connection_id: string;
  profile: Profile;
  last_message: string | null;
  last_message_at: string | null;
  unread_count?: number;
}

export interface MatchWithProfile extends MatchSuggestion {
  profile: Profile;
}

export interface MessageWithSender extends Message {
  full_name: string;
  avatar_url: string | null;
}
