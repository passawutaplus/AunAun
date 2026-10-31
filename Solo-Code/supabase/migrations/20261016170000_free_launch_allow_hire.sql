-- Free MVP: no money moves through SAMECOR, so "open to hire" on a project no longer needs KYC.
-- enforce_project_allow_hire_verified silently flipped allow_hire to false for unverified owners,
-- which blocked the Hire half of Discover → Connect → Hire. The function is kept; phase 2
-- (VITE_SAMECOR_COMMERCE_ENABLED) re-creates the trigger:
--   create trigger trg_enforce_project_allow_hire_verified before insert or update of allow_hire, owner_id on anthem.projects
--     for each row execute function anthem.enforce_project_allow_hire_verified();
drop trigger if exists trg_enforce_project_allow_hire_verified on anthem.projects;
