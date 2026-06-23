const DIRECTMAIL_ENDPOINT = "https://dm.aliyuncs.com/";
const DIRECTMAIL_VERSION = "2015-11-23";

type DirectMailConfig = {
  accessKeyId: string;
  accessKeySecret: string;
  accountName: string;
  fromAlias?: string;
  regionId: string;
  endpoint: string;
};

type DirectMailMessage = {
  to: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
};

export class DirectMailConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectMailConfigError";
  }
}

export class DirectMailSendError extends Error {
  code?: string;
  requestId?: string;
  status?: number;

  constructor(
    message: string,
    options?: { code?: string; requestId?: string; status?: number },
  ) {
    super(message);
    this.name = "DirectMailSendError";
    this.code = options?.code;
    this.requestId = options?.requestId;
    this.status = options?.status;
  }
}

export function hasDirectMailConfig(env: CloudflareEnv) {
  return Boolean(
    env.ALIYUN_ACCESS_KEY_ID &&
      env.ALIYUN_ACCESS_KEY_SECRET &&
      env.ALIYUN_DIRECTMAIL_ACCOUNT_NAME,
  );
}

export async function sendDirectMail(
  env: CloudflareEnv,
  message: DirectMailMessage,
) {
  const config = getDirectMailConfig(env);
  const params = buildSingleSendMailParams(config, message);
  const signature = await signAliyunRpcParams(
    "POST",
    params,
    config.accessKeySecret,
  );
  const body = new URLSearchParams({ ...params, Signature: signature });

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const responseText = await response.text();
  const payload = parseDirectMailResponse(responseText);

  if (!response.ok || payload.Code) {
    throw new DirectMailSendError(
      "DirectMail request failed",
      {
        code: payload.Code,
        requestId: payload.RequestId,
        status: response.status,
      },
    );
  }
}

function getDirectMailConfig(env: CloudflareEnv): DirectMailConfig {
  if (!env.ALIYUN_ACCESS_KEY_ID) {
    throw new DirectMailConfigError("ALIYUN_ACCESS_KEY_ID is not configured");
  }
  if (!env.ALIYUN_ACCESS_KEY_SECRET) {
    throw new DirectMailConfigError(
      "ALIYUN_ACCESS_KEY_SECRET is not configured",
    );
  }
  if (!env.ALIYUN_DIRECTMAIL_ACCOUNT_NAME) {
    throw new DirectMailConfigError(
      "ALIYUN_DIRECTMAIL_ACCOUNT_NAME is not configured",
    );
  }

  return {
    accessKeyId: env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: env.ALIYUN_ACCESS_KEY_SECRET,
    accountName: env.ALIYUN_DIRECTMAIL_ACCOUNT_NAME,
    fromAlias: env.ALIYUN_DIRECTMAIL_FROM_ALIAS,
    regionId: env.ALIYUN_DIRECTMAIL_REGION_ID || "cn-hangzhou",
    endpoint: env.ALIYUN_DIRECTMAIL_ENDPOINT || DIRECTMAIL_ENDPOINT,
  };
}

function buildSingleSendMailParams(
  config: DirectMailConfig,
  message: DirectMailMessage,
) {
  if (!message.htmlBody && !message.textBody) {
    throw new DirectMailConfigError(
      "DirectMail message needs htmlBody or textBody",
    );
  }

  return compactRecord({
    Action: "SingleSendMail",
    Format: "JSON",
    Version: DIRECTMAIL_VERSION,
    AccessKeyId: config.accessKeyId,
    SignatureMethod: "HMAC-SHA1",
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    SignatureVersion: "1.0",
    SignatureNonce: crypto.randomUUID(),
    RegionId: config.regionId,
    AccountName: config.accountName,
    AddressType: "1",
    ReplyToAddress: "false",
    FromAlias: config.fromAlias,
    ToAddress: message.to,
    Subject: message.subject,
    HtmlBody: message.htmlBody,
    TextBody: message.textBody,
    ClickTrace: "0",
  });
}

async function signAliyunRpcParams(
  method: "GET" | "POST",
  params: Record<string, string>,
  accessKeySecret: string,
) {
  const canonicalizedQueryString = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&");
  const stringToSign = `${method}&${percentEncode("/")}&${percentEncode(
    canonicalizedQueryString,
  )}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${accessKeySecret}&`),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(stringToSign),
  );

  return arrayBufferToBase64(signature);
}

function percentEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/\!/g, "%21")
    .replace(/\'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function compactRecord(record: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  );
}

function parseDirectMailResponse(text: string) {
  if (!text) {
    return {} as { Code?: string; Message?: string; RequestId?: string };
  }

  try {
    return JSON.parse(text) as {
      Code?: string;
      Message?: string;
      RequestId?: string;
    };
  } catch {
    return {
      Code: "InvalidDirectMailResponse",
      Message: text,
    };
  }
}
