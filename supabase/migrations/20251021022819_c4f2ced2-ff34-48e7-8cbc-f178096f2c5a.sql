-- Allow INVENTAR role to delete doormats
CREATE POLICY "Inventar can delete doormats" 
ON public.doormats 
FOR DELETE 
USING (has_role(auth.uid(), 'INVENTAR'::app_role));