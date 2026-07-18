export type Database = {
  public: {
    Tables: {
      people: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          role: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          role?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          role?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      special_days: {
        Row: {
          id: string;
          person_id: string;
          title: string;
          date: string;
          icon: string;
          accent: string;
          nudges: string[];
          repeat_unit: string;
          repeat_interval: number;
          is_birthday: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          person_id: string;
          title: string;
          date: string;
          icon?: string;
          accent?: string;
          nudges?: string[];
          repeat_unit?: string;
          repeat_interval?: number;
          is_birthday?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          person_id?: string;
          title?: string;
          date?: string;
          icon?: string;
          accent?: string;
          nudges?: string[];
          repeat_unit?: string;
          repeat_interval?: number;
          is_birthday?: boolean;
          created_at?: string;
        };
      };
      my_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          date: string;
          icon: string;
          accent: string;
          nudges: string[];
          repeat_unit: string;
          repeat_interval: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          date: string;
          icon?: string;
          accent?: string;
          nudges?: string[];
          repeat_unit?: string;
          repeat_interval?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          date?: string;
          icon?: string;
          accent?: string;
          nudges?: string[];
          repeat_unit?: string;
          repeat_interval?: number;
          created_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          person_id: string;
          special_day_id: string | null;
          kind: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          person_id: string;
          special_day_id?: string | null;
          kind: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          person_id?: string;
          special_day_id?: string | null;
          kind?: string;
          body?: string;
          created_at?: string;
        };
      };
    };
  };
};
