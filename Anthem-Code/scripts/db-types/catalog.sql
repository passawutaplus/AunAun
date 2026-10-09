-- Column catalog for the anthem + shared schemas (input for gen_types.py).
select coalesce(json_agg(x order by sch, tbl, pos), '[]') from (
  select c.table_schema sch, c.table_name tbl, t.table_type kind, c.ordinal_position pos, c.column_name col,
         c.data_type dt, c.udt_name udt, (c.is_nullable = 'YES') nul,
         (c.column_default is not null or c.is_identity = 'YES' or c.is_generated = 'ALWAYS') has_def,
         (c.is_generated = 'ALWAYS') gen
  from information_schema.columns c
  join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
  where c.table_schema in ('anthem', 'shared')
) x;
