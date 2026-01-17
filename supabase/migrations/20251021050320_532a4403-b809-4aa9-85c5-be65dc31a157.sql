-- Add DELETE policy for contacts table
CREATE POLICY "Sellers can delete their contacts"
ON public.contacts
FOR DELETE
USING (seller_id = auth.uid());