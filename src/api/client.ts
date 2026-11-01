import type { z } from "zod";
import { formApi } from "@shared/contracts/form-api";
import { apiRequest } from "./http";

type Operation = (typeof formApi)[keyof typeof formApi];

type PathParams<Path extends string> = Path extends `${string}:${infer Param}/${infer Rest}`
  ? { [K in Param]: string } & PathParams<`/${Rest}`>
  : Path extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : Record<never, never>;

type HasParams<Path extends string> = Path extends `${string}:${string}` ? true : false;

type CallArgs<Op extends Operation> = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
} & (HasParams<Op["path"]> extends true ? { params: PathParams<Op["path"]> } : object) &
  (Op extends { body: z.ZodTypeAny }
    ? Op extends { bodyOptional: true }
      ? { body?: z.input<Op["body"]> }
      : { body: z.input<Op["body"]> }
    : object) &
  (Op extends { query: z.ZodTypeAny } ? { query?: z.input<Op["query"]> } : object);

type RequiredKeys<T> = {
  [Key in keyof T]-?: undefined extends T[Key] ? never : Key;
}[keyof T];

type ApiClient<Api extends Record<string, Operation>> = {
  [Name in keyof Api]: [RequiredKeys<CallArgs<Api[Name]>>] extends [never]
    ? (args?: CallArgs<Api[Name]>) => Promise<z.output<Api[Name]["response"]>>
    : (args: CallArgs<Api[Name]>) => Promise<z.output<Api[Name]["response"]>>;
};

type CallInput = {
  params?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

export function createApiClient<const Api extends Record<string, Operation>>(
  api: Api,
): ApiClient<Api> {
  const client = {} as ApiClient<Api>;
  for (const name of Object.keys(api) as (keyof Api)[]) {
    const operation = api[name];
    client[name] = ((args?: CallArgs<Api[typeof name]>) =>
      callOperation(operation, args as CallInput | undefined)) as ApiClient<Api>[typeof name];
  }
  return client;
}

export const apiClient = createApiClient(formApi);

async function callOperation<Op extends Operation>(
  operation: Op,
  args: CallInput | undefined,
): Promise<z.output<Op["response"]>> {
  return apiRequest(
    fillPath(operation.path, args?.params),
    operation.response as z.ZodType<z.output<Op["response"]>>,
    {
      method: operation.method,
      body: args?.body,
      query: args?.query,
      signal: args?.signal,
      headers: args?.headers,
    },
  );
}

function fillPath(path: string, params: Record<string, string> | undefined): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, (_match, name: string) => {
    const value = params?.[name];
    if (!value) {
      throw new Error(`Missing path parameter ${name}`);
    }
    return encodeURIComponent(value);
  });
}
