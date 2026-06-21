import { sendDirectMail } from "@/lib/email/directmail";
import { SITE } from "@/lib/site";

export type AuthEmailOTPType =
  | "email-verification"
  | "forget-password"
  | "change-email"
  | "sign-in";

type AuthOTPEmail = {
  email: string;
  otp: string;
  type: AuthEmailOTPType;
};

export async function sendAuthOTPEmail(
  env: CloudflareEnv,
  data: AuthOTPEmail,
) {
  const subject = getSubject(data.type);
  const textBody = [
    `${SITE.name} 验证码：${data.otp}`,
    "",
    `这个验证码用于${getPurpose(data.type)}，10 分钟内有效。`,
    "如果不是你本人操作，可以忽略这封邮件。",
  ].join("\n");
  const htmlBody = [
    `<p>${SITE.name} 验证码：</p>`,
    `<p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${escapeHtml(data.otp)}</p>`,
    `<p>这个验证码用于${getPurpose(data.type)}，10 分钟内有效。</p>`,
    `<p>如果不是你本人操作，可以忽略这封邮件。</p>`,
  ].join("");

  try {
    await sendDirectMail(env, {
      to: data.email,
      subject,
      textBody,
      htmlBody,
    });
  } catch (error) {
    console.error("Auth OTP email failed", {
      type: data.type,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
            }
          : String(error),
    });
    throw error;
  }
}

function getSubject(type: AuthEmailOTPType) {
  switch (type) {
    case "forget-password":
      return `${SITE.name} 密码重置验证码`;
    case "change-email":
      return `${SITE.name} 邮箱修改验证码`;
    case "sign-in":
      return `${SITE.name} 登录验证码`;
    case "email-verification":
    default:
      return `${SITE.name} 注册验证码`;
  }
}

function getPurpose(type: AuthEmailOTPType) {
  switch (type) {
    case "forget-password":
      return "重置密码";
    case "change-email":
      return "修改邮箱";
    case "sign-in":
      return "登录";
    case "email-verification":
    default:
      return "注册邮箱验证";
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}
