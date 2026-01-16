import React, { useState } from "react";

interface SearchFormProps {
  onSearch: (query: string, category: string) => void;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, category);
  };

  const handleClear = () => {
    setQuery("");
    setCategory("all");
    onSearch("", "all");
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Search products form"
      className="search-form"
    >
      <div className="form-group">
        <label htmlFor="search-query" id="search-query-label">
          Search products
        </label>
        <input
          type="text"
          id="search-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter product name or keyword"
          aria-label="Search products by name or keyword"
          aria-describedby="search-help"
        />
        <span id="search-help" className="help-text">
          Enter keywords to find products
        </span>
      </div>

      <div className="form-group">
        <label htmlFor="category-filter" id="category-label">
          Filter by category
        </label>
        <select
          id="category-filter"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter products by category"
        >
          <option value="all">All Categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Sports">Sports</option>
          <option value="Home">Home</option>
        </select>
      </div>

      <div className="button-group">
        <button
          type="submit"
          aria-label="Search products"
          className="primary-button"
        >
          Search
        </button>
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search filters"
          className="secondary-button"
        >
          Clear Filters
        </button>
      </div>
    </form>
  );
};
