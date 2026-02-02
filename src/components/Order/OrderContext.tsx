/**
 * Order Context - Shopping Cart State Management
 * Persists cart to localStorage for cross-session retention
 */

import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

// Types
export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  image?: string;
}

export interface CartState {
  items: CartItem[];
  deliveryType: 'delivery' | 'pickup';
  deliveryFee: number;
}

interface OrderContextType {
  cart: CartState;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  updateItemNotes: (id: number, notes: string) => void;
  setDeliveryType: (type: 'delivery' | 'pickup') => void;
  clearCart: () => void;
  subtotal: number;
  total: number;
  itemCount: number;
  isLoaded: boolean;
}

// Actions
type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'UPDATE_QUANTITY'; payload: { id: number; quantity: number } }
  | { type: 'UPDATE_NOTES'; payload: { id: number; notes: string } }
  | { type: 'SET_DELIVERY_TYPE'; payload: 'delivery' | 'pickup' }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartState };

const DELIVERY_FEE = 3.50;
const STORAGE_KEY = 'tgo_cart';

// Helper to load cart from localStorage
const loadCartFromStorage = (): CartState | null => {
  try {
    const savedCart = localStorage.getItem(STORAGE_KEY);
    if (savedCart) {
      const parsed = JSON.parse(savedCart);
      // Validate the structure
      if (parsed && Array.isArray(parsed.items)) {
        return {
          items: parsed.items,
          deliveryType: parsed.deliveryType || 'pickup',
          deliveryFee: parsed.deliveryType === 'delivery' ? DELIVERY_FEE : 0
        };
      }
    }
  } catch (e) {
    console.error('Error loading cart from storage:', e);
  }
  return null;
};

// Helper to save cart to localStorage
const saveCartToStorage = (cart: CartState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    console.error('Error saving cart to storage:', e);
  }
};

// Initial state - try to load from localStorage first
const getInitialState = (): CartState => {
  const savedCart = loadCartFromStorage();
  if (savedCart) {
    return savedCart;
  }
  return {
    items: [],
    deliveryType: 'pickup',
    deliveryFee: 0
  };
};

// Reducer
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex(item => item.id === action.payload.id);
      
      if (existingIndex >= 0) {
        const newItems = [...state.items];
        newItems[existingIndex].quantity += 1;
        return { ...state, items: newItems };
      }
      
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }]
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };

    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.id !== action.payload.id)
        };
      }
      
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      };
    }

    case 'UPDATE_NOTES':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, notes: action.payload.notes }
            : item
        )
      };

    case 'SET_DELIVERY_TYPE':
      return {
        ...state,
        deliveryType: action.payload,
        deliveryFee: action.payload === 'delivery' ? DELIVERY_FEE : 0
      };

    case 'CLEAR_CART':
      return {
        items: [],
        deliveryType: 'pickup',
        deliveryFee: 0
      };

    case 'LOAD_CART':
      return action.payload;

    default:
      return state;
  }
}

// Context
const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Provider
export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize with saved cart from localStorage
  const [cart, dispatch] = useReducer(cartReducer, null, getInitialState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Mark as loaded after initial render
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage whenever it changes (after initial load)
  useEffect(() => {
    if (isLoaded) {
      saveCartToStorage(cart);
    }
  }, [cart, isLoaded]);

  // Calculate totals (ensure price is a number)
  const subtotal = cart.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const total = subtotal + (cart.deliveryType === 'delivery' ? cart.deliveryFee : 0);
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  // Actions - wrapped in useCallback for stability
  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  }, []);

  const removeFromCart = useCallback((id: number) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  }, []);

  const updateQuantity = useCallback((id: number, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  }, []);

  const updateItemNotes = useCallback((id: number, notes: string) => {
    dispatch({ type: 'UPDATE_NOTES', payload: { id, notes } });
  }, []);

  const setDeliveryType = useCallback((type: 'delivery' | 'pickup') => {
    dispatch({ type: 'SET_DELIVERY_TYPE', payload: type });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
    // Also clear from storage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing cart from storage:', e);
    }
  }, []);

  return (
    <OrderContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateItemNotes,
        setDeliveryType,
        clearCart,
        subtotal,
        total,
        itemCount,
        isLoaded
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

// Hook
export const useOrder = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};

export default OrderContext;
