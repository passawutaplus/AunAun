-- Owners can add/remove items on their own inspire boards (vault-like moodboard).
DROP POLICY IF EXISTS "owners insert inspire items" ON anthem.inspire_items;
CREATE POLICY "owners insert inspire items"
  ON anthem.inspire_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM anthem.inspire_boards b
      WHERE b.id = inspire_items.board_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners delete inspire items" ON anthem.inspire_items;
CREATE POLICY "owners delete inspire items"
  ON anthem.inspire_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM anthem.inspire_boards b
      WHERE b.id = inspire_items.board_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners update inspire items" ON anthem.inspire_items;
CREATE POLICY "owners update inspire items"
  ON anthem.inspire_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM anthem.inspire_boards b
      WHERE b.id = inspire_items.board_id
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM anthem.inspire_boards b
      WHERE b.id = inspire_items.board_id
        AND b.owner_id = auth.uid()
    )
  );
