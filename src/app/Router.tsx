import type { ComponentType } from "react";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  type RouteObject,
} from "react-router-dom";
import { LoadingState } from "@/shared/ui/LoadingState";
import { AppLayout } from "./AppLayout";
import { NotFoundPage } from "./NotFoundPage";

/**
 * Each page is its own chunk, loaded when its route matches. Respondents on
 * `/f/:formId` never download the builder, drag-and-drop or the responses view.
 */
function page(load: () => Promise<ComponentType>): Pick<RouteObject, "lazy"> {
  return { lazy: async () => ({ Component: await load() }) };
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    HydrateFallback: () => <LoadingState label="Loading" />,
    children: [
      {
        index: true,
        ...page(() =>
          import("@/features/forms/components/DashboardPage").then((m) => m.DashboardPage),
        ),
      },
      {
        path: "forms/:formId",
        ...page(() =>
          import("@/features/form-builder/components/layout/FormDraftLayout").then(
            (m) => m.FormDraftLayout,
          ),
        ),
        children: [
          { index: true, element: <Navigate to="edit" replace /> },
          {
            path: "edit",
            ...page(() =>
              import("@/features/form-builder/components/editor/FormBuilderPage").then(
                (m) => m.FormBuilderPage,
              ),
            ),
          },
          {
            path: "preview",
            ...page(() =>
              import("@/features/form-builder/components/layout/FormPreviewPage").then(
                (m) => m.FormPreviewPage,
              ),
            ),
          },
          {
            path: "responses",
            ...page(() =>
              import("@/features/responses/components/ResponsesPage").then(
                (m) => m.ResponsesPage,
              ),
            ),
          },
        ],
      },
      {
        path: "f/:formId",
        ...page(() =>
          import("@/features/form-fill/components/FormFillPage").then((m) => m.FormFillPage),
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
