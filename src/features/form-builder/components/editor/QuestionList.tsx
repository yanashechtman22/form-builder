import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useClickOutside } from "@mantine/hooks";
import clsx from "clsx";
import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react";
import type { QuestionType } from "@shared/contracts/questions";
import { PlusIcon } from "@/shared/ui/Icons";
import type { DraftValidationIssue } from "../../draft/form-draft";
import { issuesForQuestion } from "../../draft/save-issues";
import { useFormDraft } from "../../hooks/form-draft-context";
import { QuestionCard } from "./QuestionCard";
import { SlashMenu } from "./SlashMenu";
import { useInsertMenuPlacement } from "./use-insert-menu-placement";
import { useTypeMenu } from "./use-type-menu";
import styles from "./QuestionList.module.css";

type SortableQuestionCardProps = Omit<
  ComponentProps<typeof QuestionCard>,
  "questionId" | "dragAttributes" | "dragListeners" | "setNodeRef" | "style"
> & { id: string };

/** Adds drag-and-drop to a card. Memoized so only cards whose props changed re-render. */
const SortableQuestionCard = memo(function SortableQuestionCard({
  id,
  ...cardProps
}: SortableQuestionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = useMemo<CSSProperties>(
    () => ({
      // Translate only: `CSS.Transform` adds a scale that squishes a card when it
      // is dragged past cards of a different height (the active card is taller).
      transform: CSS.Translate.toString(transform),
      transition,
      opacity: isDragging ? 0.85 : 1,
      zIndex: isDragging ? 5 : undefined,
    }),
    [transform, transition, isDragging],
  );

  return (
    <QuestionCard
      {...cardProps}
      questionId={id}
      dragAttributes={attributes}
      dragListeners={listeners}
      setNodeRef={setNodeRef}
      style={style}
    />
  );
});

const NO_ISSUES: DraftValidationIssue[] = [];

function InsertGap({ onInsert }: { onInsert: (type: QuestionType) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const { anchorRef, menuRef, placement, menuTop } = useInsertMenuPlacement(open);
  const typeMenu = useTypeMenu(open, "");

  const menuClass = {
    below: styles.menuBelow,
    above: styles.menuAbove,
    right: styles.menuRight,
    left: styles.menuLeft,
  }[placement];

  return (
    <div
      ref={rootRef}
      className={clsx(styles.insertGap, open && styles.insertGapOpen)}
    >
      <div className={styles.insertControl} ref={anchorRef}>
        <button
          type="button"
          className={styles.insertButton}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? typeMenu.listboxId : undefined}
          aria-activedescendant={open ? typeMenu.activeOptionId : undefined}
          aria-label="Insert question"
          onClick={() => setOpen((value) => !value)}
          onKeyDown={(event) => {
            const action = typeMenu.onKeyDown(event);
            if (action.type === "close") {
              setOpen(false);
            }
            if (action.type === "select") {
              onInsert(action.questionType);
              setOpen(false);
            }
          }}
        >
          <PlusIcon size={12} />
          <span className={styles.insertButtonLabel}>Insert</span>
        </button>
        {open ? (
          <div
            ref={menuRef}
            className={clsx(styles.menuAnchor, menuClass)}
            style={menuTop === undefined ? undefined : { top: menuTop }}
          >
            <SlashMenu
              id={typeMenu.listboxId}
              open={open}
              types={typeMenu.types}
              activeIndex={typeMenu.activeIndex}
              optionId={typeMenu.optionId}
              onActiveIndexChange={typeMenu.setActiveIndex}
              onSelect={(type) => {
                onInsert(type);
                setOpen(false);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function QuestionList() {
  const {
    fields,
    activeQuestionId,
    setActiveQuestionId,
    pendingFocusQuestionId,
    setPendingFocusQuestionId,
    saveIssues,
    insertQuestion,
    duplicateQuestion,
    removeQuestion,
    moveQuestion,
  } = useFormDraft();
  const clearPendingFocus = useCallback(
    () => setPendingFocusQuestionId(null),
    [setPendingFocusQuestionId],
  );
  // One array per question, kept referentially stable while `saveIssues` is unchanged.
  const issuesByQuestion = useMemo(
    () =>
      fields.map((_, index) => {
        const issues = issuesForQuestion(saveIssues, index);
        return issues.length === 0 ? NO_ISSUES : issues;
      }),
    [fields, saveIssues],
  );
  const listRef = useRef<HTMLDivElement>(null);
  const keepCardInList = useMemo<Modifier>(
    () =>
      ({ transform, draggingNodeRect }) => {
        const list = listRef.current?.getBoundingClientRect();
        if (!draggingNodeRect || !list) {
          return transform;
        }
        let y = transform.y;
        if (draggingNodeRect.top + y < list.top) {
          y = list.top - draggingNodeRect.top;
        } else if (draggingNodeRect.bottom + y > list.bottom) {
          y = list.bottom - draggingNodeRect.bottom;
        }
        return { ...transform, y };
      },
    [],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = fields.findIndex((field) => field.id === active.id);
    const newIndex = fields.findIndex((field) => field.id === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    moveQuestion(oldIndex, newIndex);
  }

  return (
    <div className={styles.list} ref={listRef}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        autoScroll={false}
        modifiers={[keepCardInList]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
          {fields.map((field, index) => (
            <div key={field.fieldKey}>
              <SortableQuestionCard
                id={field.id}
                index={index}
                isActive={field.id === activeQuestionId}
                issues={issuesByQuestion[index] ?? NO_ISSUES}
                canDelete={fields.length > 1}
                autoFocusPrompt={field.id === pendingFocusQuestionId}
                onAutoFocused={clearPendingFocus}
                onActivate={setActiveQuestionId}
                onDuplicate={duplicateQuestion}
                onDelete={removeQuestion}
              />
              <InsertGap onInsert={(type) => insertQuestion(type, index)} />
            </div>
          ))}
        </SortableContext>
      </DndContext>

      <p className={styles.hint}>
        Type <kbd className="kbd">/</kbd> in an empty question title to choose a type
      </p>
    </div>
  );
}
