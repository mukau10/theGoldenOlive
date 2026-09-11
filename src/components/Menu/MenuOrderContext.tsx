import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface OrderExtra {
  id: string;
  name: string;
  price: number;
}

export interface OrderLine {
  uid: string;
  itemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  extras: OrderExtra[];
}

interface MenuOrderContextValue {
  lines: OrderLine[];
  addLine: (line: Omit<OrderLine, 'uid' | 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (uid: string, quantity: number) => void;
  removeLine: (uid: string) => void;
  clearOrder: () => void;
  itemCount: number;
  total: number;
  ticketId: string;
}

const MenuOrderContext = createContext<MenuOrderContextValue | null>(null);

function extrasKey(extras: OrderExtra[]): string {
  return extras
    .map((extra) => extra.id)
    .sort()
    .join('+');
}

function createUid(itemId: string, extras: OrderExtra[]): string {
  return `${itemId}::${extrasKey(extras)}`;
}

export function lineTotal(line: OrderLine): number {
  const extrasTotal = line.extras.reduce((sum, extra) => sum + extra.price, 0);
  return (line.basePrice + extrasTotal) * line.quantity;
}

function createTicketId(): string {
  return `GO-${Date.now().toString().slice(-4)}`;
}

export function MenuOrderProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [ticketId, setTicketId] = useState(createTicketId);

  const addLine = useCallback((incoming: Omit<OrderLine, 'uid' | 'quantity'> & { quantity?: number }) => {
    const extras = incoming.extras ?? [];
    const uid = createUid(incoming.itemId, extras);
    const quantity = incoming.quantity ?? 1;

    setLines((current) => {
      const existing = current.find((line) => line.uid === uid);
      if (existing) {
        return current.map((line) =>
          line.uid === uid ? { ...line, quantity: line.quantity + quantity } : line
        );
      }
      return [...current, { ...incoming, extras, quantity, uid }];
    });
  }, []);

  const updateQuantity = useCallback((uid: string, quantity: number) => {
    setLines((current) => {
      if (quantity <= 0) return current.filter((line) => line.uid !== uid);
      return current.map((line) => (line.uid === uid ? { ...line, quantity } : line));
    });
  }, []);

  const removeLine = useCallback((uid: string) => {
    setLines((current) => current.filter((line) => line.uid !== uid));
  }, []);

  const clearOrder = useCallback(() => {
    setLines([]);
    setTicketId(createTicketId());
  }, []);

  const value = useMemo(() => {
    const total = lines.reduce((sum, line) => sum + lineTotal(line), 0);
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    return { lines, addLine, updateQuantity, removeLine, clearOrder, itemCount, total, ticketId };
  }, [lines, addLine, updateQuantity, removeLine, clearOrder, ticketId]);

  return <MenuOrderContext.Provider value={value}>{children}</MenuOrderContext.Provider>;
}

export function useMenuOrder() {
  const context = useContext(MenuOrderContext);
  if (!context) {
    throw new Error('useMenuOrder must be used within MenuOrderProvider');
  }
  return context;
}

