import React, { useState, useEffect, useRef } from "react";

interface LoginModalProps {
  onClose: () => void;
  onLogin: (email: string, password: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus trap and escape key handling
  useEffect(() => {
    // Focus first input when modal opens
    firstInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    onLogin(email, password);
  };

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        aria-describedby="login-modal-description"
        className="modal"
      >
        <header className="modal-header">
          <h2 id="login-modal-title">Log In to Your Account</h2>
          <button
            onClick={onClose}
            aria-label="Close login modal"
            className="close-button"
          >
            ×
          </button>
        </header>

        <p id="login-modal-description" className="modal-description">
          Enter your credentials to access your account
        </p>

        <form onSubmit={handleSubmit} aria-label="Login form">
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="error-message"
            >
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              ref={firstInputRef}
              type="email"
              id="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              aria-required="true"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              aria-label="Password"
              aria-required="true"
              autoComplete="current-password"
            />
          </div>

          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              aria-label="Remember me on this device"
            />
            <label htmlFor="remember-me">Remember me</label>
          </div>

          <div className="button-group">
            <button
              type="submit"
              aria-label="Submit login form"
              className="primary-button"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cancel and close"
              className="secondary-button"
            >
              Cancel
            </button>
          </div>

          <div className="modal-footer">
            <a href="#forgot" aria-label="Reset your password">
              Forgot your password?
            </a>
            <a href="#signup" aria-label="Create a new account">
              Create an account
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};
