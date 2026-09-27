export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

export interface SearchProviderAdapter {
  search(query: string, limit?: number): Promise<SearchResult[]>;
}
