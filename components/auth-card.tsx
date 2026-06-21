import Link from "next/link";
import { Logo } from "@/components/logo";

/** 登录/注册共用的卡片外壳：logo + 眉标 + 标题 + 表单 + 页脚链接。 */
export function AuthCard({
  kicker,
  title,
  children,
  footer,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[72vh] max-w-md flex-col justify-center px-5 py-16">
      <div className="print-block p-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-9 w-9" withPlate={false} />
          <span className="font-display text-lg font-extrabold tracking-tight">
            草台编子识字班
          </span>
        </Link>

        <p className="kicker mt-8">{kicker}</p>
        <h1 className="mt-2 font-display text-3xl font-black">{title}</h1>

        <div className="mt-7">{children}</div>
      </div>

      {footer && (
        <p className="mt-6 text-center font-serif text-sm text-ink-soft">
          {footer}
        </p>
      )}
    </div>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

/** 带标签与说明的输入框。 */
export function Field({ label, hint, ...props }: FieldProps) {
  return (
    <label className="block">
      <span className="font-serif text-sm font-bold text-ink">{label}</span>
      <input
        className="mt-1.5 w-full border-2 border-ink bg-paper px-4 py-2.5 font-serif text-ink placeholder:text-ink-faint focus:border-red focus:outline-none"
        {...props}
      />
      {hint && (
        <span className="mt-1.5 block font-serif text-xs leading-relaxed text-ink-faint">
          {hint}
        </span>
      )}
    </label>
  );
}

/** 「或」分隔线。 */
export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-edge" />
      <span className="font-serif text-xs text-ink-faint">或</span>
      <span className="h-px flex-1 bg-edge" />
    </div>
  );
}
