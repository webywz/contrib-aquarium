export type Locale = "en" | "zh";

export function parseLocale(value: string | boolean | undefined): Locale {
  if (value === undefined || value === true || value === "en") return "en";
  if (value === "zh") return "zh";
  throw new Error(`Unknown --locale "${value}". Use en or zh.`);
}

type MessageFn = (arg: string) => string;
type MessageEntry = { en: string | MessageFn; zh: string | MessageFn };

const messages: Record<string, MessageEntry> = {
  missingUser: {
    en: "Missing --user <login>",
    zh: "缺少 --user <login>",
  },
  unknownCommand: {
    en: (cmd: string) => `Unknown command "${cmd}". Try --help.`,
    zh: (cmd: string) => `未知命令 "${cmd}"，试试 --help。`,
  },
  unknownOption: {
    en: (opt: string) => `Unknown option: ${opt}`,
    zh: (opt: string) => `未知选项: ${opt}`,
  },
  missingValue: {
    en: (flag: string) => `Missing value for --${flag}`,
    zh: (flag: string) => `缺少 --${flag} 的值`,
  },
  unexpectedArg: {
    en: (arg: string) => `Unexpected argument: ${arg}`,
    zh: (arg: string) => `意外参数: ${arg}`,
  },
  invalidWidth: {
    en: (value: string) => `Invalid --width "${value}". Use a positive number.`,
    zh: (value: string) => `无效 --width "${value}"，使用正数。`,
  },
  invalidHeight: {
    en: (value: string) => `Invalid --height "${value}". Use a positive number.`,
    zh: (value: string) => `无效 --height "${value}"，使用正数。`,
  },
  unknownSource: {
    en: (value: string) => `Unknown --source "${value}". Use auto, graphql, events, or mock.`,
    zh: (value: string) => `未知 --source "${value}"，使用 auto、graphql、events 或 mock。`,
  },
};

export function getErrorMessage(locale: Locale, key: string, arg?: string): string {
  const msg = messages[key];
  if (!msg) return key;
  const fn = locale === "zh" ? msg.zh : msg.en;
  return typeof fn === "function" && arg !== undefined ? fn(arg) : String(fn);
}
