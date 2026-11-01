/** DOM ids shared between the editor components and the hooks that scroll or focus them. */

export function questionCardDomId(questionId: string): string {
  return `question-card-${questionId}`;
}

export function questionPromptDomId(questionId: string): string {
  return `question-${questionId}-prompt`;
}
