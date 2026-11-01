import type { DraftValidationIssue } from "./form-draft";

export function questionIndexFromIssuePath(path: string): number | null {
  const match = /^questions\.(\d+)(?:\.|$)/.exec(path);
  if (!match) {
    return null;
  }
  const index = Number(match[1]);
  return Number.isInteger(index) ? index : null;
}

export function issuesForQuestion(
  issues: DraftValidationIssue[],
  index: number,
): DraftValidationIssue[] {
  const prefix = `questions.${index}`;
  return issues.filter((issue) => issue.path === prefix || issue.path.startsWith(`${prefix}.`));
}
