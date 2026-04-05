-- Trigger: derive canonical output_number from output_name on INSERT/UPDATE.
--
-- Primary enforcement for the deliverable numbering convention:
--   1 = Executive Summary
--   2 = Full Diagnostic Report
--   3 = Presentation Deck
--   4 = Implementation Roadmap
--   5 = Retainer Proposal
--
-- Fires on phase_output_content BEFORE INSERT OR UPDATE.
-- Only overrides output_number when it is NULL or 1 (the column default),
-- so explicit non-default values from trusted code paths are preserved.
-- If no pattern matches, output_number is left unchanged (no broken inserts).

CREATE OR REPLACE FUNCTION derive_output_number_from_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Only override when output_number is NULL or the column default (1)
  IF NEW.output_number IS NULL OR NEW.output_number = 1 THEN
    -- Phase 5 multi-output deliverables
    IF NEW.output_name ILIKE '%executive_summary%'
       OR NEW.output_name ILIKE '%executive summary%' THEN
      NEW.output_number := 1;

    ELSIF NEW.output_name ILIKE '%full_diagnostic_report%'
       OR NEW.output_name ILIKE '%full diagnostic report%' THEN
      NEW.output_number := 2;

    ELSIF NEW.output_name ILIKE '%presentation_deck%'
       OR NEW.output_name ILIKE '%presentation deck%' THEN
      NEW.output_number := 3;

    ELSIF NEW.output_name ILIKE '%implementation_roadmap%'
       OR NEW.output_name ILIKE '%implementation roadmap%' THEN
      NEW.output_number := 4;

    ELSIF NEW.output_name ILIKE '%retainer_proposal%'
       OR NEW.output_name ILIKE '%retainer proposal%' THEN
      NEW.output_number := 5;

    -- For single-output phases (1/2/3/4/6) and unrecognized names:
    -- leave output_number as-is (1 or whatever was passed).
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_derive_output_number ON phase_output_content;
CREATE TRIGGER trg_derive_output_number
  BEFORE INSERT OR UPDATE ON phase_output_content
  FOR EACH ROW
  EXECUTE FUNCTION derive_output_number_from_name();
