-- Enables equality comparisons inside a GiST index.
-- Needed e.g. for the "no overlapping date ranges".
CREATE EXTENSION IF NOT EXISTS btree_gist;
