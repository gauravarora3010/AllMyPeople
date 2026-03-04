-- Migration 04: Add root_node_id to graphs table

ALTER TABLE public.graphs
ADD COLUMN root_node_id uuid REFERENCES public.nodes(id) ON DELETE SET NULL;