ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners read clients" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Partners read engagements" ON engagements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Partners read contacts" ON interview_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Partners read legal" ON legal_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Partners read documents" ON documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Partners read research" ON research_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Partners read prompts" ON phase_prompts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Partners read executions" ON phase_executions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Partners read deliverables" ON deliverables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Partners read activity" ON activity_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public read active prompts" ON phase_prompts FOR SELECT TO anon USING (is_active = true);
