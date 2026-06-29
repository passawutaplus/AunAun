-- Ensure authenticated clients can read welcome mission claims (verify flow)
GRANT SELECT, INSERT ON shared.welcome_mission_claims TO authenticated;

-- Chat tables used by Aplus1 + Solo (if policies exist but grants were missing)
GRANT SELECT, INSERT, UPDATE ON shared.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON shared.conversation_members TO authenticated;
GRANT SELECT, INSERT ON shared.messages TO authenticated;
