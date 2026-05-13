-- Add pgvector extension
create extension if not exists vector;

-- Add embedding column to cocktails table (384-dimensional vector)
alter table cocktails
add column embedding vector(384);

-- Create HNSW index for fast similarity search (cosine distance)
-- HNSW (Hierarchical Navigable Small World) is more efficient than IVFFlat for small datasets
create index on cocktails using hnsw (embedding vector_cosine_ops);

-- Create a function for fast similarity search by cosine distance
create or replace function similarity_search(
  query_embedding vector,
  match_count int default 5,
  similarity_threshold float default 0.7
)
returns table (
  id text,
  name text,
  similarity float
) as $$
  select
    cocktails.id,
    cocktails.name,
    (1 - (cocktails.embedding <=> query_embedding)) as similarity
  from cocktails
  where cocktails.embedding is not null
  order by cocktails.embedding <=> query_embedding
  limit match_count;
$$ language sql stable;

-- Create a function to get semantically similar drinks
create or replace function find_similar_drinks(
  drink_id text,
  match_count int default 5
)
returns table (
  id text,
  name text,
  similarity float
) as $$
  select
    other.id,
    other.name,
    (1 - (other.embedding <=> base.embedding)) as similarity
  from cocktails base
  join cocktails other on base.id != other.id
  where base.id = drink_id
    and base.embedding is not null
    and other.embedding is not null
  order by other.embedding <=> base.embedding
  limit match_count;
$$ language sql stable;

-- Comment for documentation
comment on column cocktails.embedding is 'Vector embedding (384 dims) from Xenova/all-MiniLM-L6-v2, used for semantic similarity search and RAG.';
comment on function similarity_search is 'Find drinks similar to a query embedding vector.';
comment on function find_similar_drinks is 'Find drinks similar to another drink by ID.';
