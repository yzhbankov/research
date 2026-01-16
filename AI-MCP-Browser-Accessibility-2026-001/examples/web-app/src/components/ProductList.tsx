import React from "react";
import { Product } from "../App";

interface ProductListProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ products, onAddToCart }) => {
  if (products.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="No products found"
        className="no-results"
      >
        <p>No products found. Try adjusting your search criteria.</p>
      </div>
    );
  }

  return (
    <ul
      role="list"
      aria-label="Product listing"
      className="product-list"
    >
      {products.map((product) => (
        <li
          key={product.id}
          role="listitem"
          aria-label={`Product: ${product.name}`}
          className="product-card"
        >
          <article aria-labelledby={`product-title-${product.id}`}>
            <header>
              <h3 id={`product-title-${product.id}`}>{product.name}</h3>
              <span
                className="category-badge"
                aria-label={`Category: ${product.category}`}
              >
                {product.category}
              </span>
            </header>

            <p
              className="product-description"
              aria-label={`Description: ${product.description}`}
            >
              {product.description}
            </p>

            <footer className="product-footer">
              <span
                className="price"
                aria-label={`Price: $${product.price.toFixed(2)}`}
              >
                ${product.price.toFixed(2)}
              </span>

              <button
                onClick={() => onAddToCart(product)}
                aria-label={`Add ${product.name} to cart`}
                className="add-to-cart-button"
              >
                Add to Cart
              </button>
            </footer>
          </article>
        </li>
      ))}
    </ul>
  );
};
