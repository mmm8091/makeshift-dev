import { cn } from "@/lib/utils";

/**
 * QQ 头像。统一走 /api/avatar/qq/:qq 代理，不直接拼腾讯 URL。
 * 用原生 <img> 而非 next/image，避免为头像源配置远程域名；代理已做缓存。
 */
export function QQAvatar({
  qq,
  name,
  className,
}: {
  qq: string;
  name: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/avatar/qq/${qq}`}
      alt={name}
      loading="lazy"
      className={cn(
        "aspect-square w-full object-cover bg-paper-3 select-none",
        className,
      )}
    />
  );
}
