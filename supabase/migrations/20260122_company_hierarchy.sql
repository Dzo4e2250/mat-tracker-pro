-- Add parent_company_id to companies table for company hierarchy
ALTER TABLE mat_tracker.companies
ADD COLUMN parent_company_id uuid REFERENCES mat_tracker.companies(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_companies_parent_company_id ON mat_tracker.companies(parent_company_id);

-- Comment
COMMENT ON COLUMN mat_tracker.companies.parent_company_id IS 'Reference to parent company for subsidiary relationships';

-- Link existing companies: Aqualatio Slovenj Gradec -> MESTNA OBČINA SLOVENJ GRADEC
-- First find the parent company ID, then update the child
UPDATE mat_tracker.companies child
SET parent_company_id = parent.id
FROM mat_tracker.companies parent
WHERE (child.name ILIKE '%Aqualatio%Slovenj Gradec%' OR child.display_name ILIKE '%Aqualatio%Slovenj Gradec%')
  AND (parent.name ILIKE '%MESTNA OBČINA SLOVENJ GRADEC%' OR parent.display_name ILIKE '%MESTNA OBČINA SLOVENJ GRADEC%');
