ALTER TYPE public.post_type ADD VALUE IF NOT EXISTS 'bulletin';

DROP TRIGGER IF EXISTS validate_post_fields_trigger ON public.posts;
DROP TRIGGER IF EXISTS posts_touch ON public.posts;