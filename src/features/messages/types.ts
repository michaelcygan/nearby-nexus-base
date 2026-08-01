export type ThreadSummary = {
  id: string;
  post_id: string;
  post_title: string;
  neighborhood_slug: string;
  other_name: string;
  other_id: string;
  last_message: string | null;
  last_message_at: string;
  unread: boolean;
};

export type ThreadMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type ThreadDetail = {
  id: string;
  post_id: string;
  post_title: string;
  neighborhood_slug: string;
  other_name: string;
  other_id: string;
  viewer_id: string;
  messages: ThreadMessage[];
};
