import React, { useState } from "react";
import { SearchForm } from "./components/SearchForm";
import { ProductList } from "./components/ProductList";
import { ShoppingCart } from "./components/ShoppingCart";
import { LoginModal } from "./components/LoginModal";
import "./App.css";

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  description: string;
}

export interface CartItem extends Product {
  quantity: number;
}

const SAMPLE_PRODUCTS: Product[] = [
  { id: 1, name: "Wireless Headphones", price: 99.99, category: "Electronics", description: "Premium noise-canceling wireless headphones" },
  { id: 2, name: "Running Shoes", price: 129.99, category: "Sports", description: "Lightweight running shoes with cushioned sole" },
  { id: 3, name: "Coffee Maker", price: 79.99, category: "Home", description: "Programmable 12-cup coffee maker" },
  { id: 4, name: "Laptop Stand", price: 49.99, category: "Electronics", description: "Adjustable aluminum laptop stand" },
  { id: 5, name: "Yoga Mat", price: 29.99, category: "Sports", description: "Non-slip exercise yoga mat" },
  { id: 6, name: "Desk Lamp", price: 39.99, category: "Home", description: "LED desk lamp with adjustable brightness" },
];

function App() {
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  const handleSearch = (query: string, category: string) => {
    let results = products;

    if (query) {
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (category && category !== "all") {
      results = results.filter((p) => p.category === category);
    }

    setFilteredProducts(results);
  };

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => (item.id === productId ? { ...item, quantity } : item))
    );
  };

  const handleLogin = (email: string, password: string) => {
    // Simulate login
    setIsLoggedIn(true);
    setUserName(email.split("@")[0]);
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName("");
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="app">
      {/* Header with navigation */}
      <header role="banner" aria-label="Site header">
        <nav role="navigation" aria-label="Main navigation">
          <h1>Accessible Shop</h1>
          <div className="nav-links">
            <a href="#products" aria-label="Browse products">
              Products
            </a>
            <a href="#cart" aria-label="View shopping cart">
              Cart ({cartItemCount})
            </a>
            {isLoggedIn ? (
              <div className="user-menu">
                <span aria-label="Logged in user">Welcome, {userName}</span>
                <button
                  onClick={handleLogout}
                  aria-label="Log out of account"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                aria-label="Open login form"
              >
                Log In
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main role="main" aria-label="Main content">
        {/* Search section */}
        <section aria-labelledby="search-heading">
          <h2 id="search-heading" className="sr-only">
            Search Products
          </h2>
          <SearchForm onSearch={handleSearch} />
        </section>

        {/* Products section */}
        <section id="products" aria-labelledby="products-heading">
          <h2 id="products-heading">Products</h2>
          <ProductList products={filteredProducts} onAddToCart={addToCart} />
        </section>

        {/* Shopping cart section */}
        <section id="cart" aria-labelledby="cart-heading">
          <h2 id="cart-heading">Shopping Cart</h2>
          <ShoppingCart
            items={cart}
            onRemove={removeFromCart}
            onUpdateQuantity={updateQuantity}
            total={cartTotal}
          />
        </section>
      </main>

      {/* Footer */}
      <footer role="contentinfo" aria-label="Site footer">
        <p>Accessible Shop - Built with accessibility in mind</p>
      </footer>

      {/* Login modal */}
      {isLoginModalOpen && (
        <LoginModal
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
}

export default App;
