export const queryKeys = {
  forms: {
    all: ["forms"] as const,
    list: () => [...queryKeys.forms.all, "list"] as const,
    detail: (formId: string) => [...queryKeys.forms.all, "detail", formId] as const,
    public: (formId: string) => [...queryKeys.forms.all, "public", formId] as const,
    submissions: (formId: string) =>
      [...queryKeys.forms.all, "submissions", formId] as const,
  },
};
