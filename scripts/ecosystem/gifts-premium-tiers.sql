-- Premium gift tiers (1,000 / 2,000 / 5,000 px) for DonationModal catalog.
INSERT INTO shared.gifts (code, name_th, name_en, price_px, icon, display_order, active)
VALUES
  ('drawing_tablet', 'แท็บเล็ตวาด', 'Drawing Tablet', 1000, 'Tablet', 7, true),
  ('pro_desk', 'โต๊ะทำงานโปร', 'Pro Desk Setup', 2000, 'Monitor', 8, true),
  ('studio_sponsor', 'สปอนเซอร์สตูดิโอ', 'Studio Sponsor', 5000, 'Crown', 9, true)
ON CONFLICT (code) DO UPDATE SET
  name_th = EXCLUDED.name_th,
  name_en = EXCLUDED.name_en,
  price_px = EXCLUDED.price_px,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  active = EXCLUDED.active;
