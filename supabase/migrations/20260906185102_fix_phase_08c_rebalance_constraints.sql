-- The rebalance functions name deferrable constraints in the public schema.
-- Keep that trusted schema in their fixed paths so SET CONSTRAINTS can resolve
-- the names. pg_temp stays last to prevent temporary-object masking.
alter function private.rebalance_collections(
  uuid,
  bigint,
  bigint[],
  text[],
  bigint
) set search_path = public, pg_temp;

alter function private.rebalance_tags(
  uuid,
  bigint[],
  text[],
  bigint
) set search_path = public, pg_temp;

alter function private.rebalance_bookmarks(
  uuid,
  bigint,
  bigint[],
  text[],
  bigint
) set search_path = public, pg_temp;
