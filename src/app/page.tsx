"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowRight, Check, CircleCheck, RotateCcw, SlidersHorizontal, X,
} from "lucide-react";

const categories = ["뷰티", "식품", "패션", "피트니스", "여행", "아웃도어", "라이프스타일", "테크", "게임", "교육"];
const platforms = ["전체", "유튜브", "인스타그램"] as const;
type Platform = typeof platforms[number];
const sizes = [
  { id: "nano", name: "나노", range: "1만 미만" },
  { id: "micro", name: "마이크로", range: "1만 이상 ~ 10만 미만" },
  { id: "macro", name: "매크로", range: "10만 이상" },
] as const;
type Size = typeof sizes[number]["id"];
type FormErrors = { budget?: string; category?: string; size?: string };
const maxBudget = 999_999_999_999;

function koreanAmount(amount: number) {
  if (!amount) return "";
  const units = [
    { value: Math.floor(amount / 100_000_000), unit: "억" },
    { value: Math.floor((amount % 100_000_000) / 10_000), unit: "만" },
    { value: amount % 10_000, unit: "" },
  ];
  return `${units.filter(({ value }) => value).map(({ value, unit }) => `${value.toLocaleString("ko-KR")}${unit}`).join(" ")} 원`;
}

export default function Home() {
  const [budget, setBudget] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [platform, setPlatform] = useState<Platform>("전체");
  const [size, setSize] = useState<Size | "">("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [confirmed, setConfirmed] = useState(false);
  const numericBudget = Number(budget);

  function updateBudget(value: string) {
    const normalized = value.replace(/,/g, "").trim();
    if (!/^\d*$/.test(normalized) || Number(normalized) > maxBudget) return;
    setBudget(normalized ? String(Number(normalized)) : "");
    setConfirmed(false);
    setErrors((previous) => ({ ...previous, budget: undefined }));
  }

  function toggleCategory(category: string) {
    setSelectedCategories((previous) => previous.includes(category)
      ? previous.filter((item) => item !== category)
      : categories.filter((item) => item === category || previous.includes(item)));
    setConfirmed(false);
    setErrors((previous) => ({ ...previous, category: undefined }));
  }

  function resetForm() {
    setBudget("");
    setSelectedCategories([]);
    setPlatform("전체");
    setSize("");
    setErrors({});
    setConfirmed(false);
  }

  function confirmConditions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (numericBudget <= 0) nextErrors.budget = "1원 이상의 예산을 입력해 주세요.";
    if (!selectedCategories.length) nextErrors.category = "카테고리를 1개 이상 선택해 주세요.";
    if (!size) nextErrors.size = "팔로워 규모를 선택해 주세요.";
    setErrors(nextErrors);
    setConfirmed(Object.keys(nextErrors).length === 0);
    if (nextErrors.budget) document.getElementById("budget")?.focus();
    else if (nextErrors.category) document.getElementById("category-0")?.focus();
    else if (nextErrors.size) document.getElementById("size-nano")?.focus();
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">본문으로 이동</a>
      <header className="site-header">
        <div className="header-inner">
          <div className="brand" aria-label="Creator Match">
            <span className="brand-symbol" aria-hidden="true">
              <svg width="27" height="27" viewBox="0 0 40 40" fill="none"><path d="M8 29V12l12 9 12-9v17M8 12l12 17 12-17" stroke="currentColor" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span>creator<span className="brand-light">match</span><span className="brand-dot">.</span></span>
          </div>
          <div className="header-section"><span className="header-divider" /><span>크리에이터 매칭</span></div>
          <span className="workspace-label"><span className="status-dot" />캠페인 워크스페이스</span>
        </div>
      </header>

      <main id="main" className="main-content">
        <div className="workspace-grid">
          <section className="form-card" aria-labelledby="form-heading">
            <div className="form-card-header">
              <div className="section-title"><SlidersHorizontal size={20} strokeWidth={1.8} aria-hidden="true" /><h1 id="form-heading">캠페인 조건</h1></div>
              <button className="reset-button" type="button" onClick={resetForm}><RotateCcw size={16} aria-hidden="true" />초기화</button>
            </div>

            <form onSubmit={confirmConditions} noValidate>
              <div className="form-fields">
                <div className="form-row">
                  <div className="row-label">
                    <label className="field-label" htmlFor="budget">예산 <span aria-hidden="true">*</span></label>
                  </div>
                  <div className="row-content">
                    <div className="budget-controls">
                      <div className={`budget-input-wrap ${errors.budget ? "has-error" : ""}`}>
                        <input
                          id="budget" name="budget" type="text" inputMode="numeric" autoComplete="off"
                          placeholder="금액 입력" value={budget === "" ? "" : numericBudget.toLocaleString("ko-KR")}
                          onChange={(event) => updateBudget(event.target.value)} required
                          aria-invalid={Boolean(errors.budget)}
                          aria-describedby={`budget-unit${numericBudget > 0 ? " budget-hint" : ""}${errors.budget ? " budget-error" : ""}`}
                        />
                        <span className="currency-unit" id="budget-unit">원</span>
                      </div>
                      <div className="quick-amounts" role="group" aria-label="예산 빠르게 추가">
                        {[500_000, 1_000_000, 5_000_000].map((amount) => (
                          <button key={amount} type="button" disabled={numericBudget + amount > maxBudget} onClick={() => updateBudget(String(numericBudget + amount))}>+{amount / 10_000}만</button>
                        ))}
                      </div>
                    </div>
                    {numericBudget > 0 && <p className="amount-hint" id="budget-hint">{koreanAmount(numericBudget)}</p>}
                    {errors.budget && <p className="field-error" id="budget-error">{errors.budget}</p>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="row-label">
                    <span className="field-label" id="category-label">카테고리 <span aria-hidden="true">*</span></span>
                    <span className="field-note" id="category-note">여러 개 선택</span>
                  </div>
                  <div className="row-content">
                    <div className="category-buttons" role="group" aria-labelledby="category-label" aria-describedby={`category-note${errors.category ? " category-error" : ""}`}>
                      {categories.map((category, index) => (
                        <button
                          key={category} id={`category-${index}`} type="button"
                          className={`category-button ${selectedCategories.includes(category) ? "is-selected" : ""} ${errors.category ? "has-error" : ""}`}
                          aria-pressed={selectedCategories.includes(category)}
                          onClick={() => toggleCategory(category)}
                        >
                          <span className="category-check" aria-hidden="true">{selectedCategories.includes(category) && <Check size={12} strokeWidth={2.5} />}</span>
                          {category}
                        </button>
                      ))}
                    </div>
                    {errors.category && <p className="field-error" id="category-error">{errors.category}</p>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="row-label"><span className="field-label" id="platform-label">플랫폼</span></div>
                  <div className="row-content">
                    <div className="platform-options" role="radiogroup" aria-labelledby="platform-label">
                      {platforms.map((option) => (
                        <label key={option} className={`choice-button ${platform === option ? "is-selected" : ""}`}>
                          <input
                            type="radio" name="platform" value={option} checked={platform === option}
                            onChange={() => { setPlatform(option); setConfirmed(false); }}
                          />
                          <span className="choice-check" aria-hidden="true">{platform === option && <Check size={16} strokeWidth={2.5} />}</span>
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="row-label"><span className="field-label" id="size-label">팔로워 규모 <span aria-hidden="true">*</span></span></div>
                  <div className="row-content">
                    <div className="size-options" role="radiogroup" aria-labelledby="size-label" aria-required="true" aria-invalid={Boolean(errors.size)} aria-describedby={errors.size ? "size-error" : undefined}>
                      {sizes.map((option) => (
                        <div className="size-choice" key={option.id}>
                          <label className={`choice-button ${size === option.id ? "is-selected" : ""} ${errors.size ? "has-error" : ""}`}>
                            <input type="radio" id={`size-${option.id}`} name="follower-size" value={option.id} checked={size === option.id} required
                              aria-describedby={`range-${option.id}`}
                              onChange={() => { setSize(option.id); setConfirmed(false); setErrors((previous) => ({ ...previous, size: undefined })); }} />
                            <span className="choice-check" aria-hidden="true">{size === option.id && <Check size={16} strokeWidth={2.5} />}</span>
                            {option.name}
                          </label>
                          <span className="size-range" id={`range-${option.id}`}>{option.range}</span>
                        </div>
                      ))}
                    </div>
                    {errors.size && <p className="field-error" id="size-error">{errors.size}</p>}
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <span className="required-caption"><span aria-hidden="true">*</span> 필수 입력</span>
                <button className="primary-button" type="submit">조건 확인하기<ArrowRight size={18} aria-hidden="true" /></button>
              </div>
              {confirmed && <div className="confirmation" role="status"><CircleCheck size={20} aria-hidden="true" /><div><strong>캠페인 조건이 준비됐어요.</strong><p>예산과 카테고리, 플랫폼({platform}), 팔로워 규모를 확인했어요.</p></div><button type="button" aria-label="확인 메시지 닫기" onClick={() => setConfirmed(false)}><X size={18} /></button></div>}
            </form>
          </section>

        </div>

        <footer className="page-footer"><span>creator match</span><span>브랜드와 크리에이터, 더 잘 만날 수 있도록.</span></footer>
      </main>
    </div>
  );
}
