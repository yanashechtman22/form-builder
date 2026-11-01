import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <EmptyState
      title="Page not found"
      description="We couldn’t find that page. You can head back to your forms."
      action={<Button onClick={() => navigate("/")}>Back to forms</Button>}
    />
  );
}
