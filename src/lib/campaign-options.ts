export const categories = ["뷰티", "식품", "패션", "피트니스", "여행", "아웃도어", "라이프스타일", "테크", "게임", "교육"];
export const platforms = ["전체", "유튜브", "인스타그램"] as const;
export const sizes = [
  { id: "nano", name: "나노", range: "1만 미만", min: 0, max: 10_000 },
  { id: "micro", name: "마이크로", range: "1만 이상 ~ 10만 미만", min: 10_000, max: 100_000 },
  { id: "macro", name: "매크로", range: "10만 이상", min: 100_000, max: null },
] as const;
export const maxBudget = 999_999_999_999;
