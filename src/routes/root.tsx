// src/routes/root.tsx
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const rootRoute = createRootRoute({
  component: () => (
    <div className="p-6 grid gap-4 bg-gray-50">
      <Outlet />
    </div>
  ),
});
