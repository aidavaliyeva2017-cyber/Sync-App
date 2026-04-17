<div align="center">

# Sync
### Purposeful Student Networking

*A native iOS app that connects students through shared interests, academic focus, and proximity — without feeds, likes, or noise.*

![Platform](https://img.shields.io/badge/Platform-iOS-black?style=flat-square)
![Framework](https://img.shields.io/badge/Framework-React%20Native%20%2F%20Expo-blue?style=flat-square)
![Backend](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=flat-square)
![Language](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square)
![Status](https://img.shields.io/badge/Status-In%20Development-orange?style=flat-square)

</div>

---

## What is Sync?

Sync is a purpose-built networking app for students. It matches people based on shared academic interests, majors, and goals — not engagement metrics, followers, or content feeds.

The core philosophy: **meaningful connections over mindless scrolling.** Sync has no feed, no follower counts, no likes, and no opportunity for procrastination. Students open the app to find someone worth connecting with, then take the conversation into the real world.

---

## Screenshots

| Home | Discover | Chats | Profile |
|------|----------|-------|---------|
| Curated daily match + pending requests + recent chats | Search & filter students by major, interest, city | All conversations + unread + incoming requests | Full profile with interests, details, and projects |

---

## Core Features

### Curated Match Suggestions
Every day, the algorithm surfaces one high-relevance student on your home dashboard. The matching logic weighs shared interests (40%), related major (25%), geographic proximity (20%), and complementary skills (15%).

### Browse & Filter (Discover)
Search all students by name, major, or interest. Filter by topic chips or toggle between in-person and online connection preference. Results are live, debounced, and never show already-connected users at the top.

### Connection Requests
Send a request with an optional 200-character intro note. The recipient sees your full profile alongside the note before deciding. Mutual requests auto-accept immediately.

### In-App Messaging
Text-only chat between connected students — functional enough for real conversation, lightweight by design. The goal is to exchange contact info and coordinate, then move to your preferred platform.

### Student Verification
Optional `.edu` email verification adds a trust badge to your profile. Not a barrier to entry — just a signal.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native with Expo SDK (managed workflow) |
| Language | TypeScript (strict) |
| Navigation | Expo Router (file-based) |
| State | Zustand |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions) |
| Auth | Email/password + Google OAuth + Apple Sign In |
| Realtime | Supabase WebSocket subscriptions (live chat, request notifications) |
| Push | Expo Notifications + Supabase Edge Functions |
| Build | EAS Build (Expo Application Services) |

---

## Design System

Sync uses a **dark glassmorphism** visual language built on three principles: clarity, intentionality, and premium restraint.

**Color palette**
- Background: `#0A0A0F` base, `#111118` surface, `#1A1A24` raised
- Primary: Teal `#1B8A8F` / `#3AAFB5` / `#5DD8DE`
- Accent: Rose `#D46B9E` / `#E88FB5`
- Glass cards: `rgba(255,255,255,0.10)` with `0.5px` white border

**Typography**
- Wordmark: Manrope ExtraBold (800), 30px, `-0.5px` tracking
- UI: SF Pro (system font), 9px–22px range

**No vanity UI** — no follower counts, no likes, no engagement metrics. Every pixel serves connection, not consumption.

---

## Database Schema

Seven tables with full Row Level Security:

```
profiles              — Core user data (interests[], major, city, verification)
connections           — Mutual connections (user_a < user_b constraint)
connection_requests   — Pending requests with intro notes and status
messages              — Chat messages (connection-scoped, text only)
message_read_status   — Unread tracking per user per conversation
notifications         — In-app notification log
match_suggestions     — Daily curated matches with relevance scores
```

All tables use UUID primary keys and `timestamptz` for timestamps. RLS policies ensure users only read and write data they're authorized to access.

---

## Project Structure

```
sync-app/
├── app/
│   ├── (auth)/           # Welcome, Sign Up, Login, Email Verification
│   ├── (onboarding)/     # 5-step profile creation wizard
│   ├── (tabs)/           # Home, Discover, Chats, Profile
│   ├── chat/[id].tsx     # Chat thread (dynamic route)
│   ├── profile/[id].tsx  # Other user's profile view
│   ├── edit-profile.tsx
│   ├── settings.tsx
│   └── notifications.tsx
├── components/
│   ├── ui/               # GlassCard, Button, Tag, Avatar, SearchBar, Toast
│   ├── MatchCard.tsx
│   ├── StudentCard.tsx
│   ├── ChatListItem.tsx
│   ├── RequestCard.tsx
│   ├── ConnectionModal.tsx
│   └── NotificationBanner.tsx
├── lib/                  # supabase.ts, queries.ts, auth.ts, realtime.ts
├── stores/               # authStore, profileStore, chatStore, notificationStore
├── constants/            # colors.ts, typography.ts, interests.ts
└── types/                # database.ts, navigation.ts
```

---

## Build Plan

| Layer | Focus | Timeline |
|-------|-------|----------|
| 1 | Foundation — Expo setup, Supabase schema, design system primitives, tab navigator | Week 1 |
| 2 | Auth & Onboarding — Sign up, login, 5-step wizard, session persistence | Week 2 |
| 3 | Profile & Discovery — My Profile, Edit Profile, Discover screen, Profile View | Week 3 |
| 4 | Connections & Home — Connection modal, request flow, Home dashboard | Week 4 |
| 5 | Messaging — Chat list, chat thread, Supabase Realtime, unread tracking | Week 5 |
| 6 | Match Algorithm & Notifications — Daily cron, push notifications, Settings | Week 6 |
| 7–8 | Polish & Launch — Animations, skeletons, empty states, error handling, App Store submission | Weeks 7–8 |

---

## What Sync Intentionally Does NOT Have

| Feature | Why it's excluded |
|---------|-------------------|
| Feed / Timeline | Prevents doomscrolling and procrastination |
| Likes / Reactions | Students are valued for who they are, not engagement |
| Follower / Following counts | Connections are mutual — no vanity metrics |
| Stories / Reels / Posts | Not a content platform |
| Algorithmic content | No attention-harvesting; students control discovery |
| Ads | Clean, distraction-free experience |
| Read receipts | Reduces pressure |
| Typing indicators | Keeps messaging calm |
| Media sharing | Lightweight by design |

---

## Planned (Post-MVP)

- Block and report functionality
- Admin review queue for flagged accounts
- Group connections / study circles
- Calendar integration for meetup coordination

---

## Documentation

| Document | Contents |
|----------|----------|
| `Sync_App_Concept_Document.md` | Vision, feature scope, anti-patterns |
| `Sync_Design_System.md` | Full visual identity, color palette, component specs |
| `Sync_Data_Model_Backend_Architecture.md` | DB schema, RLS policies, Edge Functions, query patterns |
| `Sync_User_Flow_Map.md` | Every screen, every tap, every state transition |

---

<div align="center">

*Sync — connect with intention.*

</div>
