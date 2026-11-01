import { Group, Modal, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { Button } from "./Button";

type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm?: () => void;
  onCancel: () => void;
  children?: ReactNode;
  actions?: ReactNode;
};

export function Dialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  onCancel,
  children,
  actions,
}: DialogProps) {
  return (
    <Modal opened={open} onClose={onCancel} title={title} centered>
      {description ? (
        <Text c="dimmed" mb="md">
          {description}
        </Text>
      ) : null}
      {children}
      <Group justify="flex-end" mt="lg" gap="sm">
        {actions ?? (
          <>
            <Button variant="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
            {onConfirm ? (
              <Button
                variant={tone === "danger" ? "danger" : "primary"}
                onClick={onConfirm}
                autoFocus
              >
                {confirmLabel}
              </Button>
            ) : null}
          </>
        )}
      </Group>
    </Modal>
  );
}
