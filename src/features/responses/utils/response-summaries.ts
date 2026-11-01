import { checkboxLabel, type Question } from "@shared/contracts/questions";
import type { SubmissionDto } from "@shared/contracts/submissions";

export type SummaryRow = {
  key: string;
  label: string;
  count: number;
};

export type SummaryBlock = {
  questionId: string;
  prompt: string;
  rows: SummaryRow[];
};

type BlockBuilder = {
  questionId: string;
  prompt: string;
  rows: Map<string, SummaryRow>;
};

export function summarizeSubmissions(submissions: SubmissionDto[]): SummaryBlock[] {
  const blocks = new Map<string, BlockBuilder>();
  const order: string[] = [];

  for (const submission of [...submissions].reverse()) {
    for (const question of submission.formSnapshot.questions) {
      if (!isSummarizedQuestion(question)) {
        continue;
      }
      let block = blocks.get(question.id);
      if (!block) {
        block = { questionId: question.id, prompt: question.prompt, rows: new Map() };
        blocks.set(question.id, block);
        order.push(question.id);
      }
      block.prompt = question.prompt;
      applySnapshot(block, question, submission);
    }
  }

  return order.map((questionId) => {
    const block = blocks.get(questionId);
    return {
      questionId,
      prompt: block?.prompt ?? "",
      rows: block ? [...block.rows.values()] : [],
    };
  });
}

function isSummarizedQuestion(
  question: Question,
): question is Extract<Question, { type: "singleSelect" | "multiSelect" | "rating" | "checkbox" }> {
  return (
    question.type === "singleSelect" ||
    question.type === "multiSelect" ||
    question.type === "rating" ||
    question.type === "checkbox"
  );
}

function applySnapshot(block: BlockBuilder, question: Question, submission: SubmissionDto): void {
  if (question.type === "singleSelect" || question.type === "multiSelect") {
    applyChoice(block, question, submission);
    return;
  }
  if (question.type === "rating") {
    applyRating(block, question, submission);
    return;
  }
  if (question.type === "checkbox") {
    applyCheckbox(block, question, submission);
  }
}

function applyChoice(
  block: BlockBuilder,
  question: Extract<Question, { type: "singleSelect" | "multiSelect" }>,
  submission: SubmissionDto,
): void {
  for (const option of question.options) {
    ensureRow(block, choiceKey(option.id, option.label), option.label);
  }
  const answer = submission.answers.find((item) => item.questionId === question.id);
  if (!answer) {
    return;
  }
  const selected =
    answer.type === "singleSelect"
      ? [answer.value]
      : answer.type === "multiSelect"
        ? answer.value
        : [];
  for (const optionId of selected) {
    const option = question.options.find((item) => item.id === optionId);
    const label = option?.label ?? "Unknown option";
    const key = option ? choiceKey(option.id, option.label) : `unknown:${optionId}`;
    ensureRow(block, key, label);
    increment(block, key);
  }
}

function applyRating(
  block: BlockBuilder,
  question: Extract<Question, { type: "rating" }>,
  submission: SubmissionDto,
): void {
  for (let value = 1; value <= question.max; value += 1) {
    ensureRow(block, `rating:${value}`, String(value));
  }
  const answer = submission.answers.find(
    (item) => item.questionId === question.id && item.type === "rating",
  );
  if (!answer || answer.type !== "rating") {
    return;
  }
  ensureRow(block, `rating:${answer.value}`, String(answer.value));
  increment(block, `rating:${answer.value}`);
}

function applyCheckbox(
  block: BlockBuilder,
  question: Extract<Question, { type: "checkbox" }>,
  submission: SubmissionDto,
): void {
  const label = checkboxLabel(question);
  const yesKey = `yes:${label}`;
  ensureRow(block, yesKey, label);
  ensureRow(block, "no", "No / unanswered");
  const answer = submission.answers.find((item) => item.questionId === question.id);
  const checked = answer?.type === "checkbox" && answer.value;
  increment(block, checked ? yesKey : "no");
}

function choiceKey(optionId: string, label: string): string {
  return `${optionId}:${label}`;
}

function ensureRow(block: BlockBuilder, key: string, label: string): void {
  if (!block.rows.has(key)) {
    block.rows.set(key, { key, label, count: 0 });
  }
}

function increment(block: BlockBuilder, key: string): void {
  const row = block.rows.get(key);
  if (row) {
    row.count += 1;
  }
}
