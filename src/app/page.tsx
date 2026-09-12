"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowRight, Check, CircleCheck, Info, RotateCcw, SlidersHorizontal, X,
} from "lucide-react";

const categories = ["뷰티", "식품", "패션", "피트니스", "여행", "아웃도어", "라이프스타일", "테크", "게임", "교육"];
const platforms = ["전체", "유튜브", "인스타그램"] as const;
type Platform = typeof platforms[number];
const sizes = [
  { id: "nano", name: "나노", range: "1만 미만", bars: 1 },
  { id: "micro", name: "마이크로", range: "1만 이상 ~ 10만 미만", bars: 2 },
  { id: "macro", name: "매크로", range: "10만 이상", bars: 3 },
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
              <div className="section-title"><SlidersHorizontal size={20} strokeWidth={1.8} /><h1 id="form-heading">캠페인 조건</h1></div>
              <span className="required-caption"><span>*</span> 필수 입력</span>
            </div>

            <form onSubmit={confirmConditions} noValidate>
              <div className="form-fields">
                <div className="form-section">
                  <label className="field-label" htmlFor="budget">캠페인 예산 <span>*</span></label>
                  <p className="field-description" id="budget-description">사용 가능한 캠페인 예산을 입력해 주세요.</p>
                  <div className={`budget-input-wrap ${errors.budget ? "has-error" : ""}`}>
                    <span className="currency-symbol" aria-hidden="true">₩</span>
                    <input
                      id="budget" name="budget" type="text" inputMode="numeric" autoComplete="off"
                      placeholder="예산을 입력해 주세요" value={budget === "" ? "" : numericBudget.toLocaleString("ko-KR")}
                      onChange={(event) => updateBudget(event.target.value)}
                      aria-required="true" aria-invalid={Boolean(errors.budget)}
                      aria-describedby={`budget-description budget-hint${errors.budget ? " budget-error" : ""}`}
                    />
                    <span className="currency-unit">원</span>
                  </div>
                  <div className="budget-tools">
                    <div className="quick-amounts" aria-label="예산 빠르게 추가">
                      {[500_000, 1_000_000, 5_000_000].map((amount) => (
                        <button key={amount} type="button" disabled={numericBudget + amount > maxBudget} onClick={() => updateBudget(String(numericBudget + amount))}>+{amount / 10_000}만</button>
                      ))}
                    </div>
                    <span className="amount-hint" id="budget-hint">{numericBudget > 0 ? koreanAmount(numericBudget) : "원 단위로 입력"}</span>
                  </div>
                  {errors.budget && <p className="field-error" id="budget-error">{errors.budget}</p>}
                </div>

                <div className="form-section">
                  <div className="label-row"><span className="field-label" id="category-label">카테고리 <span>*</span></span><span className="optional-tag">여러 개 선택 가능</span></div>
                  <p className="field-description" id="category-description">브랜드나 제품과 관련된 카테고리를 선택해 주세요.</p>
                  <div className="category-buttons" role="group" aria-labelledby="category-label" aria-describedby={`category-description${errors.category ? " category-error" : ""}`}>
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

                <fieldset className="form-section platform-section" aria-describedby="platform-description">
                  <legend className="field-label">플랫폼</legend>
                  <p className="field-description" id="platform-description">크리에이터가 활동하는 플랫폼을 선택해 주세요.</p>
                  <div className="platform-options">
                    {platforms.map((option) => (
                      <label key={option} className={`platform-option ${platform === option ? "is-selected" : ""}`}>
                        <input
                          type="radio" name="platform" value={option} checked={platform === option}
                          onChange={() => { setPlatform(option); setConfirmed(false); }}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className={`form-section follower-section ${errors.size ? "follower-error" : ""}`} aria-describedby={`size-description${errors.size ? " size-error" : ""}`}>
                  <legend className="field-label">팔로워 규모 <span>*</span></legend>
                  <p className="field-description" id="size-description">함께하고 싶은 크리에이터의 규모를 선택해 주세요.</p>
                  <div className="size-options">
                    {sizes.map((option) => (
                      <label key={option.id} className={`size-option ${size === option.id ? "is-selected" : ""}`}>
                        <input type="radio" id={`size-${option.id}`} name="follower-size" value={option.id} checked={size === option.id}
                          aria-required="true" aria-invalid={Boolean(errors.size)}
                          onChange={() => { setSize(option.id); setConfirmed(false); setErrors((previous) => ({ ...previous, size: undefined })); }} />
                        <div className="size-card-top"><span className="scale-bars" aria-hidden="true">{[1, 2, 3].map((bar) => <i key={bar} className={bar <= option.bars ? "filled" : ""} />)}</span><span className="radio-indicator" aria-hidden="true">{size === option.id && <Check size={11} strokeWidth={3} />}</span></div>
                        <strong>{option.name}</strong><span className="size-range">{option.range}</span>
                      </label>
                    ))}
                  </div>
                  <p className="size-note"><Info size={14} />구독자 수를 포함한 팔로워 수 기준이에요.</p>
                  {errors.size && <p className="field-error" id="size-error">{errors.size}</p>}
                </fieldset>
              </div>

              <div className="form-actions">
                <button className="reset-button" type="button" onClick={resetForm}><RotateCcw size={15} />초기화</button>
                <button className="primary-button" type="submit">조건 확인하기<ArrowRight size={18} /></button>
              </div>
              {confirmed && <div className="confirmation" role="status"><CircleCheck size={19} /><div><strong>캠페인 조건이 준비됐어요.</strong><p>예산과 카테고리, 플랫폼({platform}), 팔로워 규모를 확인했어요.</p></div><button type="button" aria-label="확인 메시지 닫기" onClick={() => setConfirmed(false)}><X size={16} /></button></div>}
            </form>
          </section>

        </div>

        <footer className="page-footer"><span>creator match</span><span>브랜드와 크리에이터, 더 잘 만날 수 있도록.</span></footer>
      </main>
    </div>
  );
}
