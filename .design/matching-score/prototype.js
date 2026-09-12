/* Interactive design proposal. Uses the current app's precomputed metric scores. */
const ALL = window.CREATORS;
const KEYS = ['engagement', 'views', 'rating', 'costPerView'];
const LABELS = { engagement: '참여율', views: '평균 조회수', rating: '광고주 평점', costPerView: '조회당 비용' };
const VALUES = { engagement: 'engagementRate', views: 'avgViewCount', rating: 'rating', costPerView: 'costPerView' };
const CATEGORIES = ['뷰티','식품','패션','피트니스','여행','아웃도어','라이프스타일','테크','게임','교육'];
const INITIAL_WEIGHTS = { engagement:25, views:25, rating:10, costPerView:40 };
const initialQuery = () => ({ platform:'all', budget:1500000, tier:'마이크로', categories:['식품'] });
let draftQuery = initialQuery();
let query = initialQuery();
let weights = {...INITIAL_WEIGHTS};
let draftWeights = {...weights};
let previousWeights = null;
let expanded = 'C0107';
let openedMetrics = new Set(['C0107:engagement']);
let sort = 'match';
let notice = '';
const $ = (s) => document.querySelector(s);
const int = (n) => Math.round(n).toLocaleString('ko-KR');
const precise = (n) => Number(n.toFixed(3)).toFixed(3);
const money = (n) => `${Number((n/10000).toFixed(1))}만 원`;
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const score = (c,w=weights) => KEYS.reduce((sum,k)=>sum+c.metrics[k].score*w[k]/100,0);
const validCreator = (c) => c.hasHistory && KEYS.every(k=>c.metrics[k] && Number.isFinite(c[VALUES[k]]));
const matchesQuery = (c) => (query.platform==='all'||c.platform===query.platform) && c.tier===query.tier && query.categories.includes(c.category);
const ranked = (w=weights) => ALL.filter(c=>validCreator(c)&&matchesQuery(c)&&c.rate<=query.budget).sort((a,b)=>score(b,w)-score(a,w)||b.engagementRate-a.engagementRate||a.id.localeCompare(b.id));
const raw = (c,k) => k==='engagement'?`${c.engagementRate.toFixed(1)}%`:k==='views'?`${int(c.avgViewCount)}회`:k==='rating'?`${c.rating.toFixed(1)} <small style="display:inline">/ 5점</small>`:`${int(c.costPerView)}원 <small style="display:inline">/ 회</small>`;

function renderFilters() {
  $('#platforms').innerHTML = [['all','전체'],['유튜브','유튜브'],['인스타그램','인스타그램']].map(([v,l])=>`<button type="button" data-platform="${v}" aria-pressed="${draftQuery.platform===v}">${l}</button>`).join('');
  $('#tiers').innerHTML = [['나노','1.5만 미만'],['마이크로','1.5만–10만 미만'],['매크로','10만 이상']].map(([v,l])=>`<button type="button" class="tier-option" data-tier="${v}" aria-pressed="${draftQuery.tier===v}">${v}<small>${l}</small></button>`).join('');
  $('#categories').innerHTML = CATEGORIES.map(c=>`<button type="button" data-category="${c}" aria-pressed="${draftQuery.categories.includes(c)}">${c}</button>`).join('');
  updateSearchState();
}
function updateSearchState() {
  const valid = draftQuery.budget > 0 && draftQuery.categories.length > 0;
  $('#search-form button[type=submit]').disabled = !valid;
  $('#budget-hint').textContent = draftQuery.budget>0?`${money(draftQuery.budget)} 이하`:'예산을 입력해주세요';
  $('#search-state').textContent = !draftQuery.categories.length?'카테고리를 한 개 이상 선택해주세요.':JSON.stringify(draftQuery)!==JSON.stringify(query)?'조건을 바꿨어요. 검색하면 결과에 반영됩니다.':'과거 평균 단가가 예산 이내인 후보를 찾아요.';
}
function renderWeights() {
  $('#weights').innerHTML = KEYS.map(k=>`<div class="weight-row" style="--metric:var(--${k})"><label class="metric-label" for="weight-${k}"><span class="dot"></span>${LABELS[k]}</label><input class="weight-range" data-range="${k}" type="range" min="0" max="100" step="1" value="${draftWeights[k]}" aria-label="${LABELS[k]} 비중 슬라이더"/><div class="weight-number"><input id="weight-${k}" data-weight="${k}" type="number" min="0" max="100" step="1" value="${draftWeights[k]}" aria-label="${LABELS[k]} 비중"/><span>%</span></div></div>`).join('');
  updateWeightState();
}
function updateWeightState() {
  const sum = KEYS.reduce((s,k)=>s+(draftWeights[k]??0),0);
  const inRange = KEYS.every(k=>Number.isInteger(draftWeights[k])&&draftWeights[k]>=0&&draftWeights[k]<=100);
  const valid = sum===100 && inRange;
  const changed = KEYS.some(k=>draftWeights[k]!==weights[k]);
  $('#weight-total').innerHTML = `합계 <strong>${sum}%</strong> ${valid?'✓':''}<small>${!inRange?'각 비중은 0–100 사이 정수로 입력해주세요.':sum>100?`${sum-100}%를 줄이면 적용할 수 있어요.`:sum<100?`${100-sum}%를 더하면 적용할 수 있어요.`:changed?'적용하면 점수와 순위가 다시 계산됩니다.':'네 항목의 합계는 100%예요.'}</small>`;
  $('#weight-total').classList.toggle('invalid', !valid);
  $('#apply-weights').disabled = !valid || !changed;
  $('#weight-state').textContent = changed?'변경 중':'적용 중';
  $('#weight-state').classList.toggle('pending', changed);
}
function metricFormula(c,k) {
  const m=c.metrics[k];
  const pool=ALL.filter(o=>(k==='rating'||o.tier===c.tier)&&Number.isFinite(o[VALUES[k]])&&o[VALUES[k]]!==null);
  const ties=pool.filter(o=>o.id!==c.id&&o[VALUES[k]]===c[VALUES[k]]).length;
  const better=m.rank-1;
  const cost=k==='costPerView'?`<p class="cost-formula">조회당 비용 = ${int(c.rate)}원 ÷ ${int(c.avgViewCount)}회 = ${c.costPerView.toFixed(3)}…원<br/>표에는 ${int(c.costPerView)}원으로 표시하고, 순위 비교에는 반올림 전 값을 사용해요.</p>`:'';
  return `${cost}<p>항목 점수 = 100 − [(더 ${k==='costPerView'?'낮은':'높은'} 수치의 인원 + 동점자 ÷ 2) ÷ (비교 인원 − 1) × 100]</p><p class="numeric-formula">${m.groupSize<=1?'비교 대상이 1명이면 중간값인 50점을 부여해요.':`100 − [(${better} + ${ties} ÷ 2) ÷ (${m.groupSize} − 1) × 100] ≈ <strong>${m.score.toFixed(1)}점</strong>`}</p><p>동점자는 본인을 제외한 ${ties}명 · 항목 점수는 소수 첫째 자리로 반올림</p>`;
}
function breakdown(c) {
  const total=score(c);
  const max=KEYS.reduce((a,k)=>c.metrics[k].score*weights[k]>c.metrics[a].score*weights[a]?k:a,KEYS[0]);
  return `<section class="breakdown" id="calculation-${c.id}" aria-label="${escapeHtml(c.name)} 매칭 점수 계산 내역">
    <div class="breakdown-heading"><h3><span class="calculation-icon">=</span>이 점수, 이렇게 계산했어요</h3><p>실제 수치 → 상대 평가 → 비중 적용 → 최종 점수</p></div>
    <div class="breakdown-columns"><div class="metric-calculations">
      <div class="calculation-head"><span>평가 항목</span><span>실제 수치</span><span>항목 점수 / 100</span><span>반영 비중</span><span>기여 점수</span></div>
      ${KEYS.map(k=>{const m=c.metrics[k];return `<article class="metric-block" style="--metric:var(--${k})"><div class="metric-flow"><div><span class="metric-name"><span class="dot"></span>${LABELS[k]}</span><small class="metric-direction">${k==='costPerView'?'낮을수록 유리 ↓':'높을수록 유리 ↑'}</small></div><div class="raw-value">${raw(c,k)}</div><span class="operator">→</span><div class="metric-score">${m.score.toFixed(1)}<small>점</small><div class="metric-score-bar"><i style="width:${m.score}%"></i></div></div><span class="operator">×</span><span class="weight-value">${weights[k]}%</span><span class="operator">=</span><div class="contribution">${precise(m.score*weights[k]/100)}<small>점</small></div></div><details class="metric-details" data-metric="${c.id}:${k}" ${openedMetrics.has(`${c.id}:${k}`)?'open':''}><summary><span>${m.groupLabel} ${m.groupSize}명 중 ${m.tied?'공동 ':''}${m.rank}등${k==='rating'?' · 평점 보유자 기준':k==='costPerView'?' · 비용 산출 가능자 기준':''}</span><span class="formula-toggle">${m.score.toFixed(1)}점 산정식</span></summary><div class="formula-content">${metricFormula(c,k)}</div></details></article>`}).join('')}
      <div class="sum-formula"><span class="sum-label">최종 공식 · 각 항목 점수 × 비중을 모두 더해요</span>${KEYS.map(k=>`<span class="formula-term">(${c.metrics[k].score.toFixed(1)} × ${weights[k]}%)</span>`).join(' + ')}<br/><strong>= ${precise(total)}점 → 반올림 ${Math.round(total)}점</strong></div>
    </div><div class="score-sidebar"><aside class="final-card" aria-label="최종 매칭 점수"><div class="final-label">최종 매칭 점수<span>100점 만점</span></div><div class="final-score">${Math.round(total)}<small>점</small></div><p class="round-note">합산 ${precise(total)}점을 반올림했어요</p><div class="stacked-bar" aria-label="항목별 기여 점수">${KEYS.map(k=>`<span style="width:${c.metrics[k].score*weights[k]/100}%;background:var(--${k})"></span>`).join('')}</div><ul class="contribution-legend">${KEYS.map(k=>`<li style="--metric:var(--${k})"><span class="legend-label"><span class="dot"></span>${LABELS[k]}</span><strong>${precise(c.metrics[k].score*weights[k]/100)}점</strong></li>`).join('')}</ul><p class="insight"><strong>${LABELS[max]}</strong> 항목이<br/><strong>${precise(c.metrics[max].score*weights[max]/100)}점</strong>으로 가장 많이 기여했어요.</p></aside><aside class="basis-card"><h4>누구와 비교한 점수인가요?</h4><p>참여율·조회수·조회당 비용<br/><strong>같은 ${c.tier} 규모의 전체 후보</strong></p><p>광고주 평점<br/><strong>평점이 있는 전체 크리에이터</strong></p><div>필터는 검색할 후보를 좁혀요.<br/>점수의 비교 집단은 유지됩니다.</div><p class="score-note">각 수치가 있는 사람끼리 비교하므로 항목별 비교 인원은 다를 수 있어요.</p></aside></div></div>
    <div class="breakdown-footer"><span>누적 캠페인 ${c.totalCampaignCount}건은 협업 경험 참고용으로, 점수에 포함되지 않아요.</span><button class="rules-link" aria-expanded="false" aria-controls="rules-${c.id}" data-rules="${c.id}">비교 집단·동점 처리 기준 ⓘ</button></div>
    <div class="rules-panel" id="rules-${c.id}" hidden><p><strong>비교 집단</strong> · 참여율·평균 조회수·조회당 비용은 같은 규모의 전체 크리에이터와 비교해요. 광고주 평점은 규모와 관계없이 평점이 있는 전체 크리에이터와 비교해요. 각 지표가 없는 사람은 해당 비교에서 제외해요.</p><p><strong>필터와 점수의 관계</strong> · 예산·플랫폼·카테고리를 바꿔도 비교 집단은 유지돼요. 검색 결과 ${ranked().length}명끼리 점수를 다시 매기는 방식이 아니에요.</p><p><strong>동점 처리</strong> · 같은 실제 수치는 평균 위치로 평가해요. 그래서 공동 1등도 반드시 100점이 되지는 않아요. 최종 점수가 같으면 참여율이 높은 후보를 먼저, 참여율도 같으면 크리에이터 ID 순으로 보여줘요.</p><p><strong>반올림</strong> · 항목 점수는 소수 첫째 자리까지 계산하고 비중을 곱해요. 기여 점수는 소수 셋째 자리까지 표시하며, 합산 후 정수로 반올림한 값을 매칭 점수로 보여줘요.</p></div>
  </section>`;
}
function renderResults() {
  const ordered=ranked();
  const ranks=new Map(ordered.map((c,i)=>[c.id,i+1]));
  const previousRanks=previousWeights?new Map(ranked(previousWeights).map((c,i)=>[c.id,i+1])):null;
  const candidates=[...ordered].sort((a,b)=>sort==='cost'?a.costPerView-b.costPerView:sort==='views'?b.avgViewCount-a.avgViewCount:0);
  $('#result-count').textContent=`${candidates.length}명`;
  $('#query-summary').textContent=`${query.platform==='all'?'전체 플랫폼':query.platform} · ${money(query.budget)} 이하 · ${query.tier} · ${query.categories.join(', ')} · 캠페인 이력 있는 후보`;
  $('#result-notice').hidden=!notice;
  $('#result-notice').textContent=notice;
  $('#results-body').innerHTML=candidates.length?candidates.map(c=>{
    const isOpen=expanded===c.id;
    const delta=previousWeights?score(c)-score(c,previousWeights):0;
    const rankDelta=previousRanks?previousRanks.get(c.id)-ranks.get(c.id):0;
    return `<tr class="creator-row ${isOpen?'active':''}" data-creator="${c.id}"><td><span class="rank-badge ${ranks.get(c.id)===1?'first':''}">${ranks.get(c.id)}</span>${rankDelta?`<small class="score-delta">${rankDelta>0?'↑':'↓'}${Math.abs(rankDelta)}</small>`:''}</td><td><div class="creator-identity"><span class="creator-avatar">${escapeHtml(c.name.slice(0,1))}</span><div><strong>${escapeHtml(c.name)}</strong><small>${c.platform} · ${c.category}</small></div></div></td><td><button class="score-button" data-expand="${c.id}" data-low="${score(c)<50}" aria-label="${escapeHtml(c.name)} ${Math.round(score(c))}점 계산 내역" aria-expanded="${isOpen}" aria-controls="calculation-${c.id}">${Math.round(score(c))}</button>${Math.abs(delta)>.0001?`<small class="score-delta">${delta>0?'+':''}${delta.toFixed(1)}점</small>`:''}</td><td>${int(c.followers)}명</td><td>${int(c.avgViewCount)}회</td><td>${c.engagementRate.toFixed(1)}%</td><td>${c.rating.toFixed(1)} <small>/ 5</small></td><td class="cost-cell">${int(c.rate)}원</td><td>${int(c.costPerView)}원</td><td><button class="detail-button" data-expand="${c.id}" aria-label="${escapeHtml(c.name)} ${isOpen?'계산 닫기':'점수 계산'}" aria-expanded="${isOpen}" aria-controls="calculation-${c.id}">${isOpen?'계산 닫기 −':'점수 계산 ＋'}</button></td></tr>${isOpen?`<tr><td colspan="10" class="expand-cell">${breakdown(c)}</td></tr>`:''}`;
  }).join(''):`<tr><td colspan="10"><div class="empty-state"><strong>조건에 맞는 이력 후보가 없어요</strong>예산을 높이거나 카테고리·플랫폼을 넓혀 다시 검색해보세요.<br/><button class="secondary-button" data-reset>사진 속 조건으로 돌아가기</button></div></td></tr>`;
  const fresh=ALL.filter(c=>!c.hasHistory&&matchesQuery(c));
  $('#new-candidates').innerHTML=!$('#history-only').checked&&fresh.length?`<section class="surface new-candidates"><h3>캠페인 이력이 없는 후보 ${fresh.length}명</h3><p>평점과 단가가 없어 매칭 점수와 예산 적합 여부는 아직 판단할 수 없어요.</p>${fresh.map(c=>`<span class="new-person">${escapeHtml(c.name)} · ${c.platform} · ${int(c.followers)}명</span>`).join('')}</section>`:'';
}
function toast(message) {
  $('#toast').textContent=message;$('#toast').hidden=false;
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,2800);
}
function reset() {
  query=initialQuery();draftQuery=initialQuery();weights={...INITIAL_WEIGHTS};draftWeights={...weights};previousWeights=null;expanded='C0107';openedMetrics=new Set(['C0107:engagement']);sort='match';notice='';
  $('#budget').value='1,500,000';$('#sort').value='match';$('#history-only').checked=false;
  renderFilters();renderWeights();renderResults();toast('사진 속 조건과 비중으로 돌아왔어요.');
}
document.addEventListener('click',e=>{
  const target=e.target.closest('button');if(!target)return;
  if(target.dataset.platform){draftQuery.platform=target.dataset.platform;renderFilters();}
  if(target.dataset.tier){draftQuery.tier=target.dataset.tier;renderFilters();}
  if(target.dataset.category){const c=target.dataset.category;draftQuery.categories=draftQuery.categories.includes(c)?draftQuery.categories.filter(x=>x!==c):[...draftQuery.categories,c];renderFilters();}
  if(target.dataset.expand){const id=target.dataset.expand;const opener=target.classList.contains('score-button')?'.score-button':'.detail-button';expanded=expanded===id?null:id;if(expanded&&!Array.from(openedMetrics).some(s=>s.startsWith(`${id}:`)))openedMetrics.add(`${id}:engagement`);renderResults();document.querySelector(`${opener}[data-expand="${id}"]`)?.focus({preventScroll:true});}
  if(target.dataset.rules){const el=$(`#rules-${target.dataset.rules}`);el.hidden=!el.hidden;target.setAttribute('aria-expanded',String(!el.hidden));}
  if(target.id==='reset'||target.hasAttribute('data-reset'))reset();
});
document.addEventListener('toggle',e=>{if(e.target.matches('details[data-metric]')){const k=e.target.dataset.metric;e.target.open?openedMetrics.add(k):openedMetrics.delete(k);}},true);
$('#budget').addEventListener('input',e=>{const cleaned=e.target.value.replace(/\D/g,'').slice(0,11);draftQuery.budget=Number(cleaned);e.target.value=cleaned?int(Number(cleaned)):'';updateSearchState();});
$('#search-form').addEventListener('submit',e=>{e.preventDefault();if(draftQuery.budget<=0||!draftQuery.categories.length)return;query={...draftQuery,categories:[...draftQuery.categories]};previousWeights=null;notice='';expanded=ranked()[0]?.id??null;if(expanded)openedMetrics.add(`${expanded}:engagement`);renderFilters();renderResults();toast(`조건에 맞는 이력 후보 ${ranked().length}명을 찾았어요.`);});
$('#weights').addEventListener('input',e=>{const k=e.target.dataset.range||e.target.dataset.weight;if(!k)return;draftWeights[k]=e.target.value===''?null:Number(e.target.value);const partner=e.target.dataset.range?$(`[data-weight="${k}"]`):$(`[data-range="${k}"]`);partner.value=draftWeights[k]??0;updateWeightState();});
$('#apply-weights').addEventListener('click',()=>{
  if($('#apply-weights').disabled)return;
  previousWeights={...weights};weights={...draftWeights};
  const changes=ranked().filter(c=>Math.abs(score(c)-score(c,previousWeights))>.0001).length;
  notice=`새 비중을 적용했어요. ${changes}명의 점수가 변경되었으며, 직전 비중 대비 점수·순위 변화를 함께 표시합니다.`;
  updateWeightState();renderResults();toast('비중에 맞춰 점수와 순위를 다시 계산했어요.');
});
$('#sort').addEventListener('change',e=>{sort=e.target.value;renderResults();});
$('#history-only').addEventListener('change',renderResults);
renderFilters();renderWeights();renderResults();
