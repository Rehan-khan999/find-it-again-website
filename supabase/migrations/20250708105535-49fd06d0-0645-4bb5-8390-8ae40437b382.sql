-- Create storage bucket for item photos
INSERT INTO storage.buckets (id, name, public) VALUES ('item-photos', 'item-photos', true);

-- Create storage policies for item photos
CREATE POLICY "Anyone can view item photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'item-photos');

CREATE POLICY "Authenticated users can upload item photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'item-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own item photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'item-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own item photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'item-photos' AND auth.uid()::text = (storage.foldername(name))[1]);