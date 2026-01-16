import React from "react";
import { CartItem } from "../App";

interface ShoppingCartProps {
  items: CartItem[];
  onRemove: (productId: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  total: number;
}

export const ShoppingCart: React.FC<ShoppingCartProps> = ({
  items,
  onRemove,
  onUpdateQuantity,
  total,
}) => {
  if (items.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Shopping cart is empty"
        className="empty-cart"
      >
        <p>Your shopping cart is empty.</p>
        <p>Browse products and add items to your cart.</p>
      </div>
    );
  }

  return (
    <div className="shopping-cart" role="region" aria-label="Shopping cart contents">
      <table aria-label="Cart items">
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col">Price</th>
            <th scope="col">Quantity</th>
            <th scope="col">Subtotal</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} aria-label={`Cart item: ${item.name}`}>
              <td>
                <span aria-label={`Product name: ${item.name}`}>{item.name}</span>
              </td>
              <td>
                <span aria-label={`Unit price: $${item.price.toFixed(2)}`}>
                  ${item.price.toFixed(2)}
                </span>
              </td>
              <td>
                <div className="quantity-controls">
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    aria-label={`Decrease quantity of ${item.name}`}
                    className="quantity-button"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      onUpdateQuantity(item.id, parseInt(e.target.value) || 0)
                    }
                    min="0"
                    aria-label={`Quantity of ${item.name}`}
                    className="quantity-input"
                  />
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    aria-label={`Increase quantity of ${item.name}`}
                    className="quantity-button"
                  >
                    +
                  </button>
                </div>
              </td>
              <td>
                <span aria-label={`Subtotal: $${(item.price * item.quantity).toFixed(2)}`}>
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </td>
              <td>
                <button
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.name} from cart`}
                  className="remove-button"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>
              <strong>Total</strong>
            </td>
            <td colSpan={2}>
              <strong aria-label={`Cart total: $${total.toFixed(2)}`}>
                ${total.toFixed(2)}
              </strong>
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="cart-actions">
        <button
          aria-label="Proceed to checkout"
          className="checkout-button"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
};
