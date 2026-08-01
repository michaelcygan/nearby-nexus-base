CREATE TYPE public.store_listing_status AS ENUM ('draft', 'available', 'reserved', 'sold', 'archived');
CREATE TYPE public.store_order_status AS ENUM ('pending', 'paid', 'cancelled', 'refunded', 'fulfilled');

ALTER TYPE public.report_target ADD VALUE IF NOT EXISTS 'store_listing';

CREATE TABLE public.store_listings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  neighborhood_id uuid NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  condition text,
  pickup_notes text,
  image_paths text[] NOT NULL DEFAULT '{}'::text[],
  status public.store_listing_status NOT NULL DEFAULT 'draft',
  stripe_product_id text,
  stripe_price_lookup_key text,
  reserved_until timestamp with time zone,
  hidden boolean NOT NULL DEFAULT false,
  removed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_listings_price_check CHECK (price_cents >= 50 AND price_cents <= 100000000),
  CONSTRAINT store_listings_title_check CHECK (char_length(btrim(title)) BETWEEN 3 AND 140)
);

CREATE INDEX store_listings_neighborhood_idx ON public.store_listings(neighborhood_id, status);

GRANT SELECT ON public.store_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_listings TO authenticated;
GRANT ALL ON public.store_listings TO service_role;

ALTER TABLE public.store_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published store listings are publicly readable"
  ON public.store_listings FOR SELECT TO anon, authenticated
  USING (hidden = false AND removed = false AND status IN ('available', 'reserved', 'sold'));

CREATE POLICY "Admins can read all store listings"
  ON public.store_listings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can create store listings"
  ON public.store_listings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins can update store listings"
  ON public.store_listings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can moderate store listings"
  ON public.store_listings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete store listings"
  ON public.store_listings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER store_listings_touch_updated_at
  BEFORE UPDATE ON public.store_listings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.store_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.store_listings(id) ON DELETE RESTRICT,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status public.store_order_status NOT NULL DEFAULT 'pending',
  environment text NOT NULL DEFAULT 'sandbox',
  stripe_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  pickup_note text,
  paid_at timestamp with time zone,
  fulfilled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX store_orders_buyer_idx ON public.store_orders(buyer_id, created_at DESC);
CREATE UNIQUE INDEX store_orders_one_sale_per_listing
  ON public.store_orders(listing_id)
  WHERE status IN ('paid', 'fulfilled');

GRANT SELECT ON public.store_orders TO authenticated;
GRANT UPDATE ON public.store_orders TO authenticated;
GRANT ALL ON public.store_orders TO service_role;

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can read their own orders"
  ON public.store_orders FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Admins can read all orders"
  ON public.store_orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders"
  ON public.store_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER store_orders_touch_updated_at
  BEFORE UPDATE ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();