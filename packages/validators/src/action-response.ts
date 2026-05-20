export type ActionResponse<T = void> =
  | { success: true; data: T extends void ? undefined : T }
  | { success: false; error: string; fieldErrors?: Partial<Record<string, string[]>> }
