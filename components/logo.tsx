import { cn } from "@/lib/utils";

/**
 * 站点标志：野草长成电路。
 * 暗绿野草主干 + 红色电路枝桠 + 金色节点 + 青色芯片。
 * 与 设计资产/logo.svg 同源，内联以便控制尺寸与无障碍标签。
 */
export function Logo({
  className,
  withPlate = true,
}: {
  className?: string;
  /** 是否带米色圆角底板（false 时透明，便于放在深色/彩色上） */
  withPlate?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={cn("block", className)}
      role="img"
      aria-label="草台编子识字班"
      xmlns="http://www.w3.org/2000/svg"
    >
      {withPlate && <rect width="256" height="256" rx="40" fill="#F7F0DF" />}
      <path
        d="M88 188C99 180 116 176 128 176C140 176 157 180 168 188C158 196 143 200 128 200C113 200 98 196 88 188Z"
        fill="#20352B"
      />
      <path
        d="M128 176V86"
        stroke="#20352B"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="M128 143C113 135 103 124 96 110"
        stroke="#20352B"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M128 133C143 125 153 113 160 98"
        stroke="#20352B"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M128 86V60H155V45"
        stroke="#B3261E"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M128 86H101V68"
        stroke="#B3261E"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="101" cy="68" r="8" fill="#D7A83F" />
      <circle cx="155" cy="45" r="8" fill="#D7A83F" />
      <circle cx="128" cy="86" r="7" fill="#D7A83F" />
      <rect x="150" y="82" width="12" height="12" rx="3" fill="#39BFC9" />
    </svg>
  );
}
