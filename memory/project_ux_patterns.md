---
name: UX Feedback Patterns
description: Toast and confirm modal conventions added March 2026
type: project
---

**Toast system** (`app/ui/toast.tsx`):
- `ToastProvider` wraps the app in `app/layout.tsx` (outside `BudgetProvider`)
- `useToast()` → `{ addToast(message, type?) }` — call from any client component
- Default type is `"error"`; `"success"` also supported
- Auto-dismisses after 4s; manual dismiss button on each toast
- Renders via `createPortal` into `document.body`

**Confirm modal** (`app/ui/confirm-modal.tsx`):
- Props: `isOpen`, `title?`, `message`, `confirmLabel?`, `onConfirm`, `onCancel`
- Closes on Escape key or backdrop click
- Pages hold `pendingDelete` state (the item), set it on Delete button click
- Modal renders at the bottom of the page JSX tree

**Pattern for delete handlers (all pages follow this):**
```tsx
const [pendingDelete, setPendingDelete] = useState<T | null>(null);
const { addToast } = useToast();

// button
onClick={() => setPendingDelete(item)}

// at bottom of return
<ConfirmModal
  isOpen={pendingDelete !== null}
  message={`Delete "${pendingDelete?.name}"?`}
  onConfirm={async () => {
    const ok = await deleteX(pendingDelete!.id);
    if (!ok) addToast("Failed to delete. Please try again.");
    setPendingDelete(null);
  }}
  onCancel={() => setPendingDelete(null)}
/>
```
