import { create } from "zustand";

interface ReceiptHistoryStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setIsOpen: (isOpen: boolean) => void;
}

export const useReceiptHistory = create<ReceiptHistoryStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setIsOpen: (isOpen) => set({ isOpen }),
}));
