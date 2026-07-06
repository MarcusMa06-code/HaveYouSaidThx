/**
 * Plain translation dictionary — no i18n library (overkill for one page).
 * English is the source of truth; zh-Hans and zh-Hant are the simplified /
 * traditional forms of the SAME translation (same wording, character-set
 * difference only — don't let them drift in vocabulary).
 *
 * Domain terms follow the product-owner glossary (see the task brief). For
 * strings that interpolate numbers/dates the value is a function.
 *
 * Translation quality note: these are legal/financial terms. The longer
 * disclaimer/caption paragraphs are translated for MEANING (natural Chinese),
 * not word-for-word. A native reviewer should sanity-check the paragraphs
 * flagged in the task report.
 */

export type Lang = "en" | "zh-Hans" | "zh-Hant";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "zh-Hans", label: "简" },
  { code: "zh-Hant", label: "繁" },
];

/** Shape of one language's dictionary, derived from the English dict so every
 * language must supply every key — but each literal is widened to its base
 * type (string / function signature) so the Chinese dicts aren't forced to
 * equal the English string literals. */
type Widen<T> = T extends (...a: infer A) => infer R ? (...a: A) => R : string;
type Dict = { [K in keyof typeof en]: Widen<(typeof en)[K]> };
export type TKey = keyof Dict;

const en = {
  subtitle: "Estimate what you'd owe NUS and MOE if you broke your S&T scholarship bond.",

  cohortLabel: "Admission cohort",
  majorLabel: "Major / programme",
  semestersLabel: (done: number, max: number) =>
    `Semesters of study completed: ${done} of ${max}`,
  bondYearsLabel: (done: number) => `Bond years completed since graduation: ${done}`,

  advancedToggleOn: "Using exact dates",
  advancedToggleOff: "Advanced: use exact bond dates",
  advancedNote: "Dates below override the bond-years slider.",
  bondStartLabel: "Bond start date (first day of Qualifying Employment)",
  asOfLabel: "Calculating as of",

  resultLabel: "Estimated total payback",
  disclaimer:
    "Estimate only, not an official NUS/MOE figure. It leaves out airfare, insurance and other variable costs, so your actual bill could be somewhat higher.",

  chartTitle: "How much you save per extra year you stay bonded",
  chartCaption:
    "Each bar is how much one more year of service knocks off what you'd owe. It's the same for every year while MOE's bond is still active (years 1–3), then drops to a smaller amount once MOE's portion is fully paid off (years 4–6).",
  chartRange: (a: number, b: number) => `Years ${a}–${b}`,

  breakdownShow: "Show calculation breakdown",
  breakdownHide: "Hide calculation breakdown",
  breakdownTitle: "Breakdown",
  breakdownMeta: (d: number, b: number) =>
    `Years scholarship money was paid to you: ${d}. Bond years completed: ${b}.`,

  nusTableTitle: "NUS payments to you, by year",
  moeTableTitle: "MOE payments to you, by year",
  colYear: "Year",
  colAmountPaid: "Amount paid",
  colRunningTotal: "Running total with interest",

  summaryTitle: "Statement summary",
  nusBeforeCap: "NUS Liquidated Damages (the amount you owe NUS under your bond) — before cap",
  nusCapApplied: "NUS cap applied (single-degree $262,000 / double-degree $295,000)",
  nusAfterCap: "NUS Liquidated Damages — after cap",
  nusAfterProRataDays: (days: number, total: number) =>
    `NUS Liquidated Damages — reduced for ${days} days served (of ${total})`,
  nusAfterProRataYears: "NUS Liquidated Damages — reduced for bond years already served",
  moeBeforeProRata:
    "MOE Tuition Grant repayment — before reduction for bond years served (no cap applies)",
  moeAfterProRataMonths: (months: number, total: number) =>
    `MOE Tuition Grant repayment — reduced for ${months} months served (of ${total})`,
  moeAfterProRataYears: "MOE Tuition Grant repayment — reduced for bond years already served",
  totalPayback: "Total payback",

  footer:
    "Unofficial estimate based on publicly available policy documents and the S&T Scholarship / Tuition Grant agreement formulas. Not financial or legal advice. See the project's docs/ folder for the full methodology and assumptions.",

  ratesAsOf: (date: string) => `Exchange rates as of ${date}`,
  ratesApprox: "Approximate exchange rates",
} as const;

const zhHans: Dict = {
  subtitle: "估算你若违反 S&T 奖学金的服务期，需要向 NUS 和教育部偿还的金额。",

  cohortLabel: "入学年份",
  majorLabel: "专业 / 课程",
  semestersLabel: (done, max) => `已完成学期数：${done} / ${max}`,
  bondYearsLabel: (done) => `毕业后已服务的服务期年数：${done}`,

  advancedToggleOn: "正在使用精确日期",
  advancedToggleOff: "高级：使用精确的服务期日期",
  advancedNote: "下方的日期将覆盖服务期年数滑块。",
  bondStartLabel: "服务期开始日期（符合条件的就业的第一天）",
  asOfLabel: "计算截止日期",

  resultLabel: "预计需偿还总额",
  disclaimer:
    "仅为估算，非 NUS/MOE 官方数字。未计入机票、保险等浮动费用，因此实际需偿还的金额可能略高。",

  chartTitle: "每多服务一年服务期能为你省下多少",
  chartCaption:
    "每根柱状条代表：多服务一年能让你少还多少。教育部的服务期仍在进行时（第 1–3 年）每年省下的金额相同；待教育部的部分偿清后（第 4–6 年），每年省下的金额降至较低的固定值。",
  chartRange: (a, b) => `第 ${a}–${b} 年`,

  breakdownShow: "显示计算明细",
  breakdownHide: "隐藏计算明细",
  breakdownTitle: "计算明细",
  breakdownMeta: (d, b) => `奖学金款项发放给你的年数：${d}。已完成的服务期年数：${b}。`,

  nusTableTitle: "NUS 逐年发放给你的款项",
  moeTableTitle: "教育部逐年发放给你的款项",
  colYear: "年份",
  colAmountPaid: "发放金额",
  colRunningTotal: "含利息累计",

  summaryTitle: "结算摘要",
  nusBeforeCap: "NUS 违约赔偿金（你在服务期下需向 NUS 偿还的金额）——封顶前",
  nusCapApplied: "NUS 封顶金额（单学位 $262,000 / 双学位 $295,000）",
  nusAfterCap: "NUS 违约赔偿金——封顶后",
  nusAfterProRataDays: (days, total) =>
    `NUS 违约赔偿金——按已服务的 ${days} 天（共 ${total} 天）比例扣减`,
  nusAfterProRataYears: "NUS 违约赔偿金——按已服务的服务期年数比例扣减",
  moeBeforeProRata: "教育部学费津贴偿还额——按已服务服务期年数扣减前（不设封顶）",
  moeAfterProRataMonths: (months, total) =>
    `教育部学费津贴偿还额——按已服务的 ${months} 个月（共 ${total} 个月）比例扣减`,
  moeAfterProRataYears: "教育部学费津贴偿还额——按已服务的服务期年数比例扣减",
  totalPayback: "偿还总额",

  footer:
    "非官方估算，依据公开的政策文件以及 S&T 奖学金 / 学费津贴协议的公式计算。不构成财务或法律建议。完整的计算方法与假设详见项目的 docs/ 文件夹。",

  ratesAsOf: (date) => `汇率截至 ${date}`,
  ratesApprox: "近似汇率",
};

const zhHant: Dict = {
  subtitle: "估算你若違反 S&T 獎學金的服務期，需要向 NUS 和教育部償還的金額。",

  cohortLabel: "入學年份",
  majorLabel: "專業 / 課程",
  semestersLabel: (done, max) => `已完成學期數：${done} / ${max}`,
  bondYearsLabel: (done) => `畢業後已服務的服務期年數：${done}`,

  advancedToggleOn: "正在使用精確日期",
  advancedToggleOff: "進階：使用精確的服務期日期",
  advancedNote: "下方的日期將覆蓋服務期年數滑桿。",
  bondStartLabel: "服務期開始日期（符合條件的就業的第一天）",
  asOfLabel: "計算截止日期",

  resultLabel: "預計需償還總額",
  disclaimer:
    "僅為估算，非 NUS/MOE 官方數字。未計入機票、保險等浮動費用，因此實際需償還的金額可能略高。",

  chartTitle: "每多服務一年服務期能為你省下多少",
  chartCaption:
    "每根柱狀條代表：多服務一年能讓你少還多少。教育部的服務期仍在進行時（第 1–3 年）每年省下的金額相同；待教育部的部分償清後（第 4–6 年），每年省下的金額降至較低的固定值。",
  chartRange: (a, b) => `第 ${a}–${b} 年`,

  breakdownShow: "顯示計算明細",
  breakdownHide: "隱藏計算明細",
  breakdownTitle: "計算明細",
  breakdownMeta: (d, b) => `獎學金款項發放給你的年數：${d}。已完成的服務期年數：${b}。`,

  nusTableTitle: "NUS 逐年發放給你的款項",
  moeTableTitle: "教育部逐年發放給你的款項",
  colYear: "年份",
  colAmountPaid: "發放金額",
  colRunningTotal: "含利息累計",

  summaryTitle: "結算摘要",
  nusBeforeCap: "NUS 違約賠償金（你在服務期下需向 NUS 償還的金額）——封頂前",
  nusCapApplied: "NUS 封頂金額（單學位 $262,000 / 雙學位 $295,000）",
  nusAfterCap: "NUS 違約賠償金——封頂後",
  nusAfterProRataDays: (days, total) =>
    `NUS 違約賠償金——按已服務的 ${days} 天（共 ${total} 天）比例扣減`,
  nusAfterProRataYears: "NUS 違約賠償金——按已服務的服務期年數比例扣減",
  moeBeforeProRata: "教育部學費津貼償還額——按已服務服務期年數扣減前（不設封頂）",
  moeAfterProRataMonths: (months, total) =>
    `教育部學費津貼償還額——按已服務的 ${months} 個月（共 ${total} 個月）比例扣減`,
  moeAfterProRataYears: "教育部學費津貼償還額——按已服務的服務期年數比例扣減",
  totalPayback: "償還總額",

  footer:
    "非官方估算，依據公開的政策文件以及 S&T 獎學金 / 學費津貼協議的公式計算。不構成財務或法律建議。完整的計算方法與假設詳見專案的 docs/ 資料夾。",

  ratesAsOf: (date) => `匯率截至 ${date}`,
  ratesApprox: "近似匯率",
};

export const translations: Record<Lang, Dict> = {
  en,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
};
