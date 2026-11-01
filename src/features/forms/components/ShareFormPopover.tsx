import { useState, type ReactElement } from "react";
import clsx from "clsx";
import { Popover } from "@/shared/ui/Popover";
import { Button } from "@/shared/ui/Button";
import { CopyIcon, ExternalLinkIcon } from "@/shared/ui/Icons";
import { IconButton } from "@/shared/ui/IconButton";
import { Input } from "@/shared/ui/Input";
import styles from "./ShareFormPopover.module.css";

type ShareFormPanelProps = {
  formId: string;
  hasUnsavedChanges?: boolean;
  acceptingResponses?: boolean;
};

export function ShareFormPanel({
  formId,
  hasUnsavedChanges = false,
  acceptingResponses = true,
}: ShareFormPanelProps) {
  const link = `${window.location.origin}/f/${formId}`;
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={styles.panel}>
      <p className={styles.title}>Share form</p>
      <p
        className={clsx(
          styles.description,
          (hasUnsavedChanges || !acceptingResponses) && styles.warning,
        )}
      >
        {shareDescription(hasUnsavedChanges, acceptingResponses)}
      </p>
      <div className={styles.linkField}>
        <Input
          readOnly
          value={link}
          aria-label="Form link"
          onFocus={(event) => event.currentTarget.select()}
        />
        <IconButton
          className={styles.copy}
          label={copied ? "Copied" : "Copy link"}
          active={copied}
          onClick={() => void copyLink()}
        >
          <CopyIcon size={14} />
        </IconButton>
      </div>
      <div className={styles.actions}>
        <Button size="sm" onClick={() => window.open(link, "_blank", "noopener,noreferrer")}>
          <ExternalLinkIcon size={14} />
          Open in new tab
        </Button>
      </div>
    </div>
  );
}

type ShareFormPopoverProps = {
  formId: string;
  hasUnsavedChanges?: boolean;
  acceptingResponses?: boolean;
  children: ReactElement;
};

export function ShareFormPopover({
  formId,
  hasUnsavedChanges = false,
  acceptingResponses = true,
  children,
}: ShareFormPopoverProps) {
  return (
    <Popover width={320}>
      <Popover.Target>{children}</Popover.Target>
      <Popover.Dropdown className={styles.dropdown}>
        <ShareFormPanel
          formId={formId}
          hasUnsavedChanges={hasUnsavedChanges}
          acceptingResponses={acceptingResponses}
        />
      </Popover.Dropdown>
    </Popover>
  );
}

function shareDescription(hasUnsavedChanges: boolean, acceptingResponses: boolean): string {
  const sentences = ["This link opens the last saved version."];
  if (hasUnsavedChanges) {
    sentences.push("You have unsaved edits. They are not on this link.");
  }
  if (!acceptingResponses) {
    sentences.push("This form is not accepting responses.");
  }
  return sentences.join(" ");
}
