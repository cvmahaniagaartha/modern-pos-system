import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  barcode: string;
  price: number;
  quantity: number;
  stock: number;
}

interface CartStore {
  items: CartItem[];
  discount: number;
  tax: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setDiscount: (discount: number) => void;
  setTax: (tax: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  discount: 0,
  tax: 0,
  
  addItem: (item) => {
    const items = get().items;
    const existingItem = items.find(i => i.productId === item.productId);
    
    if (existingItem) {
      set({
        items: items.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: Math.min(i.quantity + 1, item.stock) }
            : i
        ),
      });
    } else {
      set({ items: [...items, { ...item, quantity: 1 }] });
    }
  },
  
  removeItem: (productId) => {
    set({ items: get().items.filter(i => i.productId !== productId) });
  },
  
  updateQuantity: (productId, quantity) => {
    set({
      items: get().items.map(i =>
        i.productId === productId ? { ...i, quantity: Math.max(0, Math.min(quantity, i.stock)) } : i
      ).filter(i => i.quantity > 0),
    });
  },
  
  setDiscount: (discount) => set({ discount }),
  setTax: (tax) => set({ tax }),
  clearCart: () => set({ items: [], discount: 0, tax: 0 }),
  
  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },
  
  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().discount;
    const tax = get().tax;
    return subtotal - discount + (subtotal * tax / 100);
  },
}));
