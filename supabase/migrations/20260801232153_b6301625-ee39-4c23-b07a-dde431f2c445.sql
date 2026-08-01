DROP POLICY IF EXISTS "Post images are readable" ON storage.objects;

CREATE POLICY "Post images are readable for visible content"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'post-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE storage.objects.name = ANY (p.image_paths)
    )
    OR EXISTS (
      SELECT 1 FROM public.store_listings l
      WHERE storage.objects.name = ANY (l.image_paths)
    )
    OR (
      auth.uid() IS NOT NULL
      AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
    )
    OR public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'admin')
  )
);