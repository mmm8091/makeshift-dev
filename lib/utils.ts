import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 Tailwind class，处理冲突与条件类名。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
