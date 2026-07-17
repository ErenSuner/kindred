// Mock data standing in for a backend. Shapes match the Kindred screens.

export type Relationship = 'Family' | 'Friend' | 'Partner' | 'Colleague' | 'Acquaintance';

export type SpecialDay = {
  id: string;
  title: string;
  date: string; // display string
  icon: string; // MaterialIcons name
  accent: 'primary' | 'tertiary' | 'secondary';
  originalDate?: string; // e.g. YYYY-MM-DD
  daysAway?: number;
  turningAge?: number;
  nudges?: any[];
  isBirthday?: boolean;
  isAnnual?: boolean;
  isExpired?: boolean;
};

export type Note = {
  id: string;
  kind: string; // e.g. "Gift Idea", "Memory"
  when: string;
  body: string;
};

export type Person = {
  id: string;
  name: string;
  role: string; // e.g. "Grandmother"
  avatar?: string;
  initials?: string;
  tags: string[];
  eventTitle: string; // headline upcoming event
  eventTag: Relationship;
  daysAway: number;
  eventDate: string; // display
  countdown?: {
    tag: string;
    days: number;
    title: string;
    date: string;
    progress: number; // 0..1
  };
  specialDays?: SpecialDay[];
  birthday?: { id: string; date: string; nudges: any[] };
  notes?: Note[];
  isPinned?: boolean;
};

// Seed data — only Eleanor ships as an example.
export const initialPeople: Person[] = [
  {
    id: 'eleanor',
    name: 'Eleanor',
    role: 'Grandmother',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    tags: ['Family', 'Local'],
    eventTitle: "Mom's Birthday",
    eventTag: 'Family',
    daysAway: 5,
    eventDate: 'Thursday, October 12th',
    countdown: {
      tag: 'Birthday',
      days: 14,
      title: "Eleanor's 85th Birthday",
      date: 'October 24th, 2024',
      progress: 0.8,
    },
    specialDays: [
      { id: 'd1', title: 'Birthday', date: 'October 24', icon: 'cake', accent: 'primary' },
      { id: 'd2', title: 'Grandparents Day', date: 'September 8', icon: 'volunteer-activism', accent: 'tertiary' },
    ],
    notes: [
      {
        id: 'n1',
        kind: 'Gift Idea',
        when: '2 days ago',
        body: 'Loves that specific brand of Earl Grey tea from the little shop downtown. Also mentioned wanting a new gardening trowel.',
      },
      {
        id: 'n2',
        kind: 'Memory',
        when: 'Last Month',
        body: 'Had a wonderful afternoon looking through old photo albums. Remember to scan the pictures from her 1970 trip to Italy.',
      },
    ],
  },
];

export const currentUser = {
  name: 'Sarah',
  email: 'sarah@example.com',
  avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
};
