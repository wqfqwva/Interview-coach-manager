import {
  InterviewSetup,
  RoundEvaluation,
  FinalReportData,
  InterviewRound,
} from '../types/interview';

// Extract significant technical or topical nouns from candidate answer
export function extractKeyTerms(text: string): string[] {
  const words = text
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'“”]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  const stopWords = new Set([
    '어...', '음...', '그...', '약간', '솔직히', '진짜', '그니까', '이제', '되게', '사실상',
    '있는', '하는', '에서', '으로', '하고', '제가', '저희', '통해', '대한', '관한', '위해', '하고', '있습니다', '했습니다'
  ]);

  const candidates = words.filter((w) => !stopWords.has(w));
  return Array.from(new Set(candidates));
}

// Dynamically evaluate candidate answer based on its text, metrics, actions, and delivery stats
export function evaluateAnswerDynamically(
  setup: InterviewSetup,
  candidateAnswer: string,
  currentQuestion: string,
  speechStats: {
    durationSec: number;
    fillerCount: number;
    detectedFillers: { [key: string]: number };
    gazeOffCount: number;
    gazeCenterPercent: number;
  },
  currentRound: number,
  maxRounds: number
): RoundEvaluation {
  const isLastRound = currentRound >= maxRounds;
  const isEnglish = setup.mode === 'english';
  const isDebate = setup.mode === 'debate';
  const isPT = setup.mode === 'pt';
  const personaId = setup.interviewerPersona?.id || 'semi_master';

  const text = candidateAnswer.trim();
  const charLength = text.length;

  // 1. Metric / Numerical Specificity Check (%, ms, TPS, nm, 건, 개, 배, ℃, mTorr, V, W, A 등)
  const metricRegex = /(\d+(\.\d+)?(%|ms|s|초|분|배|건|개|원|억|만|nm|tps|v|w|a|k|℃|ghz|mhz|fps|mtorr|rpm)?)/gi;
  const metricsFound = text.match(metricRegex) || [];
  const validMetrics = metricsFound.filter((m) => /\d/.test(m) && m.length >= 2);
  const metricCount = validMetrics.length;

  // 2. Direct Ownership & Technical Action Check
  const actionKeywords = isEnglish
    ? ['designed', 'architected', 'implemented', 'optimized', 'tuned', 'reduced', 'deployed', 'built', 'analyzed', 'engineered', 'profiled']
    : ['직접', '설계', '구현', '최적화', '튜닝', '분석', '도입', '개선', '배포', '측정', '해석', '제어', '개발', '선정', '진단', '프로파일링'];
  const matchedActions = actionKeywords.filter((kw) => text.toLowerCase().includes(kw));

  // 3. Evasive, Passive, or Fluffy Words Check (Heavy penalty)
  const evasiveKeywords = isEnglish
    ? ['honestly', 'kind of', 'sort of', 'basically', 'we somehow', 'worked hard', 'probably', 'i guess', 'team did', 'not sure']
    : ['것 같', '인 것 같', '같습니다', '솔직히', '약간', '어쩌다', '그냥', '되게', '사실상', '팀원들이 다', '선임들이', '잘 모르겠지만', '이것저것', '무난하게', '열심히'];
  const matchedEvasives = evasiveKeywords.filter((kw) => text.includes(kw));

  // 4. STEM & Engineering Domain Specificity Check
  const domainKeywords = [
    '수율', '공정', '웨이퍼', '플라즈마', '에칭', '식각', '나노', 'GAA', '박막', 'ALD', 'CMP', '트랩', 'CD',
    '배터리', '양극재', '음극재', '전해액', '열폭주', 'BMS', '덴드라이트', 'SEI', '하이니켈', '단락',
    '인버터', '모터', 'CAN', 'ECU', 'ASIL', 'ISO 26262', '페일세이프', '토크', 'CAE', 'CFD', 'FEA', '유한요소',
    '커널', 'I/O', '컨텍스트', '스케줄러', '캐시', '락', '동시성', '뮤텍스', '분산', 'CAP', '합의', '쿼럼', 'io_uring',
    '레이턴시', 'P99', '트레이드오프', '마진', '임피던스', '서지', 'dv/dt', 'SiC', '오프힙', '제로카피', '고유진동수'
  ];
  const matchedDomains = domainKeywords.filter((dk) => text.includes(dk));

  // 5. Problem Context Keywords
  const contextKeywords = isEnglish
    ? ['bottleneck', 'latency', 'failure', 'issue', 'limitation', 'overheat', 'tradeoff', 'defect', 'degradation']
    : ['한계', '병목', '장애', '결함', '지연', '리스크', '트래픽', '수율', '누설', '진동', '오차', '열폭주', '서지', '열화', '단선', '크랙'];
  const matchedContext = contextKeywords.filter((kw) => text.includes(kw));

  // Calculate Sub-Scores strictly (1-100)
  // Situation: Did the candidate define the technical problem context?
  let situationScore = 30 + matchedContext.length * 15 + (matchedDomains.length >= 2 ? 15 : 0) - matchedEvasives.length * 8;
  if (charLength > 120) situationScore += 10;
  situationScore = Math.min(95, Math.max(15, situationScore));

  // Task: Was there a clear engineering target or quantitative KPI?
  let taskScore = 25 + (text.includes('목표') || text.includes('스펙') || text.includes('과제') || text.includes('기준') ? 25 : 0) + (metricCount > 0 ? 20 : 0) - matchedEvasives.length * 8;
  taskScore = Math.min(95, Math.max(15, taskScore));

  // Action: Did the candidate demonstrate direct, personal ownership vs passing buck?
  let actionScore = 25 + matchedActions.length * 16 - matchedEvasives.length * 12;
  if (text.includes('직접') || text.includes('I specifically') || text.includes('단독으로')) actionScore += 18;
  actionScore = Math.min(95, Math.max(15, actionScore));

  // Result: Strictly judge quantitative data proof (Zero tolerance for zero metrics)
  let resultScore = 20;
  if (metricCount === 0) {
    resultScore = 20; // Hard fail penalty for lack of numbers in engineering
  } else if (metricCount === 1) {
    resultScore = 52;
  } else if (metricCount === 2) {
    resultScore = 78;
  } else {
    resultScore = 94;
  }

  // Deduct heavily for lazy/short evasive responses
  if (charLength < 40) {
    situationScore = Math.min(25, situationScore);
    taskScore = Math.min(25, taskScore);
    actionScore = Math.min(20, actionScore);
    resultScore = Math.min(15, resultScore);
  } else if (charLength < 80) {
    situationScore = Math.min(50, situationScore);
    taskScore = Math.min(50, taskScore);
    actionScore = Math.min(45, actionScore);
  }

  // Delivery penalties from speechStats (verbal fillers & gaze deviation)
  const fillerPenalty = Math.min(22, (speechStats.fillerCount || 0) * 4);
  const gazePenalty = Math.min(18, (speechStats.gazeOffCount || 0) * 5);

  // Overall Weighted Round Score (Harsh & Realistic)
  const rawOverall =
    situationScore * 0.20 +
    taskScore * 0.20 +
    actionScore * 0.35 +
    resultScore * 0.25 -
    (fillerPenalty + gazePenalty) * 0.6;

  const overallScore = Math.round(Math.min(96, Math.max(18, rawOverall)));

  // Extract key terms candidate actually used for dynamic feedback
  const terms = extractKeyTerms(text);
  const focalTerm = terms[0] || (isEnglish ? 'the methodology' : '제시한 방법론');
  const secondaryTerm = terms[1] || (isEnglish ? 'the implementation' : '공정 프로세스');

  // Dynamic Strengths & Weaknesses (Deeply responsive to actual words)
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (metricCount >= 2) {
    strengths.push(
      isEnglish
        ? `Effectively substantiated outcomes with concrete engineering metrics (${validMetrics.slice(0, 2).join(', ')}).`
        : `정량적 수치 지표(${validMetrics.slice(0, 3).join(', ')})를 근거로 엔지니어링 개선 성과를 명확히 입증함.`
    );
  } else {
    weaknesses.push(
      isEnglish
        ? 'Critical Lack of Quantitative Proof: No measurable baseline or outcome metrics provided.'
        : `‘${focalTerm}’의 성과를 입증할 정량적 수치 지표(개선 전후 % 대비, 물리 단위 계측치)가 전무하여 실무 검증 불능 판정.`
    );
  }

  if (matchedActions.length >= 2) {
    strengths.push(
      isEnglish
        ? `Demonstrated direct personal technical ownership using precise verbs (${matchedActions.slice(0, 2).join(', ')}).`
        : `팀 단위 단순 참여가 아닌 지원자 본인이 직접 주도한 핵심 엔지니어링 액션(${matchedActions.slice(0, 2).join(', ')})을 구체화함.`
    );
  } else {
    weaknesses.push(
      isEnglish
        ? 'Passive attribution and vague ownership: Could not distinguish personal contribution from team efforts.'
        : `본인의 단독 기여도와 팀 전체 업무의 경계가 모호하며, 본인이 직접 작성한 코드나 설계 파라미터가 불분명함.`
    );
  }

  if (matchedEvasives.length > 0) {
    weaknesses.push(
      `‘${matchedEvasives.slice(0, 2).join("’, ‘")}’ 등의 회피성 완곡 어법과 모호한 추측성 표현을 사용하여 엔지니어로서의 단호함과 신뢰도를 크게 훼손함.`
    );
  }

  if (matchedDomains.length === 0) {
    weaknesses.push(
      `직무(${setup.jobRole})에 필수적인 공학적 기초 용어와 물리/제어 메커니즘이 완전히 결여된 채 비전공자 수준의 일상적 어휘로 일관함.`
    );
  } else if (strengths.length < 2) {
    strengths.push(
      `‘${matchedDomains.slice(0, 2).join("’, ‘")}’ 등 해당 직무의 핵심 엔지니어링 도메인 개념을 적절히 인용함.`
    );
  }

  if (speechStats.fillerCount > 3) {
    weaknesses.push(
      `발언 중 습관적 추임새(${speechStats.fillerCount}회)가 빈번하여 실전 기술 압박 상황에서 심리적 불안정을 노출함.`
    );
  }

  // Persona-specific dynamic critique & follow-up tail questions
  let nextQuestion = '';
  let tailQuestionType = '';
  let feedbackComment = '';
  let interviewerAttitude = '';

  if (isDebate) {
    tailQuestionType = '상대측 논점 타격 & 대안 추궁';
    if (metricCount === 0) {
      nextQuestion = `방금 '${focalTerm}'을(를) 강조하셨지만, 이를 뒷받침할 통계나 재무적/공학적 수치가 전혀 없습니다. 상대측의 반론을 꺾을 수 있는 구체적인 객관적 근거는 무엇입니까?`;
    } else {
      nextQuestion = `방금 말씀하신 '${focalTerm}'의 장점 이면에 숨겨진 막대한 초기 전환 비용과 현장 반발에 대한 대책은 무엇입니까? 그 비용을 상쇄할 구체적 로드맵을 밝혀주십시오.`;
    }
    feedbackComment = overallScore >= 75
      ? '상대 주장의 허점을 짚어내며 논점을 방어했으나, 반대측의 재반박 리스크에 대한 대비가 요구됩니다.'
      : '주장이 다소 감정적이거나 당위론적이며, 상대방을 압도할 수 있는 데이터 중심의 팩트가 부족합니다.';
    interviewerAttitude = overallScore >= 75 ? '턱을 괴고 지원자의 반박 논리를 흥미롭게 관찰함' : '미간을 찌푸리며 논리적 허점을 집요하게 응시함';
  } else if (isPT) {
    tailQuestionType = '예산 및 실행 맹점 검증';
    if (metricCount === 0) {
      nextQuestion = `제시하신 '${focalTerm}' 전략에서 정량적 투자 회수 기간(ROI)과 예산 집행 계획이 빠져있습니다. 초기 6개월간 목표치에 미달할 경우 어떤 비상 계획(Plan B)이 있습니까?`;
    } else {
      nextQuestion = `발표에서 '${validMetrics[0]}'을(를) 개선치로 제시하셨는데, 실제 현업 적용 시 예상치 못한 병목이 발생해 이 지표가 30% 급감한다면 어떻게 대응하시겠습니까?`;
    }
    feedbackComment = overallScore >= 75
      ? '문제 정의와 해결 전략의 연결 고리가 뚜렷합니다. 다만 실행 단계의 리스크 시나리오를 보강해야 합니다.'
      : '제안한 해결책의 현실적 실현 가능성이 떨어지며, 심사위원이 납득할 만한 리소스 배분 계획이 미흡합니다.';
    interviewerAttitude = overallScore >= 75 ? '안경을 고쳐 쓰며 발표 자료의 지표를 꼼꼼히 체크함' : '팔짱을 끼고 차가운 눈빛으로 노트를 끄적임';
  } else if (isEnglish) {
    tailQuestionType = 'Engineering Tradeoff & Root Cause';
    if (metricCount === 0) {
      nextQuestion = `You mentioned '${focalTerm}', but did not provide any quantitative metrics. What was the exact baseline metric before your intervention, and what tool did you use to verify it?`;
    } else {
      nextQuestion = `Regarding your achievement with '${focalTerm}' and ${validMetrics[0]}, what was the single biggest tradeoff you had to accept, and how did you mitigate its risk in production?`;
    }
    feedbackComment = overallScore >= 75
      ? 'Communicated technical details with confidence and logical structure.'
      : 'Response lacks precision and relies heavily on high-level assertions without engineering depth.';
    interviewerAttitude = overallScore >= 75 ? 'Nods attentively while taking notes on technical depth' : 'Furrows brows intensely, probing for missing metrics';
  } else {
    // Engineering General Interview - Differentiated by Persona & Rigor
    if (personaId === 'semi_master') {
      tailQuestionType = metricCount === 0 ? '공정 수율 메커니즘 팩트체크' : '물리화학적 한계 마진 공격';
      if (metricCount === 0) {
        nextQuestion = `방금 '${focalTerm}'을(를) 조정하셨다고 했는데, 챔버 내 플라즈마 파워나 에칭 가스 유량비 같은 핵심 변수 수치가 하나도 없습니다. 구체적으로 몇 mTorr, 몇 W에서 측정한 결과입니까?`;
      } else {
        nextQuestion = `말씀하신 '${focalTerm}'의 ${validMetrics[0]} 개선 성과 이면에, 웨이퍼 에지(Edge) 영역에서의 박막 응력이나 CD 산포 불량률은 몇 % 증가했습니까?`;
      }
      feedbackComment = overallScore >= 75
        ? `강태성 수석: "'${focalTerm}'의 메커니즘과 ${validMetrics[0] || '지표'} 근거는 명확합니다. 하지만 양산 100만 장 단위에서의 재현성 검증이 추가로 필요합니다."`
        : `강태성 수석: "추상적인 표현만 난무하고 기초 물리화학적 작용 원리가 결여되어 있습니다. 실제 양산 라인이었으면 전량 불량 폐기(Scrap) 처분 감입니다."`;
      interviewerAttitude = overallScore >= 75 ? '서류에 체크 표시를 하며 냉정한 눈빛으로 다음 한계 마진을 겨냥함' : '만년필을 딱 소리 나게 내려놓으며 차가운 시선으로 응시함';
    } else if (personaId === 'mobility_lead') {
      tailQuestionType = metricCount === 0 ? '기능안전(Fail-safe) 최악 조건 압박' : 'ISO 26262 ASIL-D 검증';
      if (metricCount === 0) {
        nextQuestion = `말씀하신 '${focalTerm}' 제어 로직에서 영하 40도 혹한기나 급가속 중 센서 단선이 발생했을 때 차량을 안전하게 정차시킬 페일세이프 시간(Fault Tolerant Time Interval)은 몇 ms입니까?`;
      } else {
        nextQuestion = `‘${validMetrics[0]}’의 응답 속도를 확보하기 위해 MCU 태스크 우선순위를 높이셨다면, 그로 인해 지연(Delay)된 저우선순위 안전 진단 태스크의 오버플로우는 어떻게 방지하셨습니까?`;
      }
      feedbackComment = overallScore >= 75
        ? `윤현우 팀장: "제어 루프의 반응성과 ${validMetrics[0] || '데이터'}는 인정합니다. 다만 극한 환경 엣지케이스에서의 마진을 증명해야 합니다."`
        : `윤현우 팀장: "이상적인 벤치 조건만 상정하셨군요. 도로 위에서 센서 하나만 고장 나도 인명 사고로 직결될 수 있는 극도로 위험한 설계입니다."`;
      interviewerAttitude = overallScore >= 75 ? '고개를 살짝 끄덕이며 다음 가혹 조건 시나리오를 설정함' : '팔짱을 끼고 굳은 표정으로 안전 설계의 맹점을 응시함';
    } else if (personaId === 'battery_specialist') {
      tailQuestionType = metricCount === 0 ? '열폭주 방열 마진 공격' : '소재 트레이드오프 검증';
      if (metricCount === 0) {
        nextQuestion = `‘${focalTerm}’을(를) 통해 에너지 밀도를 올렸다고 하셨지만, 충전 시 발생하는 발열량(J)과 셀 표면 온도 상승치 데이터가 없습니다. 열 안정성 마진은 몇 ℃입니까?`;
      } else {
        nextQuestion = `말씀하신 ‘${validMetrics[0]}’ 수명 개선에도 불구하고, 500사이클 이상 급속 충전 시 음극 표면의 리튬 덴드라이트 석출률은 어떻게 억제하셨습니까?`;
      }
      feedbackComment = overallScore >= 75
        ? `서지원 책임: "소재 특성과 ${validMetrics[0] || '개선치'}의 인과관계는 탄탄합니다. 이제 10만 셀 스케일업 시의 열 방출 편차를 보겠습니다."`
        : `서지원 책임: "하나를 얻으면 하나를 잃는 공학적 트레이드오프를 전혀 고려하지 않았습니다. 열폭주 위험에 무방비한 실험실 수준의 답변입니다."`;
      interviewerAttitude = overallScore >= 75 ? '안경을 고쳐 쓰며 데이터 시트를 검토함' : '한숨을 쉬며 실험실 데이터의 한계를 냉정하게 지적할 준비를 함';
    } else {
      // kernel_master & others
      tailQuestionType = metricCount === 0 ? '로우레벨 I/O 병목 팩트체크' : '동시성 락 경합 검증';
      if (metricCount === 0) {
        nextQuestion = `방금 '${focalTerm}' 최적화를 언급하셨는데, CPU 컨텍스트 스위칭 수나 I/O 지연시간을 프로파일러(perf/ebpf)로 측정한 정확한 수치는 무엇입니까?`;
      } else {
        nextQuestion = `말씀하신 '${validMetrics[0]}' 처리량 증대 상황에서 노드 간 네트워크 파티션이 발생했을 때 데이터 정합성(Consistency) 불일치는 어떻게 복구하셨습니까?`;
      }
      feedbackComment = overallScore >= 75
        ? `박준혁 마스터: "로우레벨 병목 원인과 ${validMetrics[0] || '지표'} 개선치가 명확합니다. 이제 분산 합의 알고리즘의 실패 케이스를 짚어보겠습니다."`
        : `박준혁 마스터: "고수준 프레임워크 뒤에 숨어 계시는군요. OS 커널과 CPU 캐시 레벨에서 바이트가 어떻게 흘렀는지 전혀 이해하지 못하고 계십니다."`;
      interviewerAttitude = overallScore >= 75 ? '키보드를 두드리며 아키텍처 다이어그램을 분석함' : '모니터 뒤에서 싸늘한 표정으로 블랙박스 식 답변의 맹점을 응시함';
    }
  }

  // Model Answer Guide
  const recommendedModelAnswerGuide = isEnglish
    ? `Start directly with the bottom-line metric: "By re-architecting ${focalTerm}, we reduced latency by 45%." Then detail your exact action and how you mitigated the tradeoff.`
    : `두괄식으로 결론을 먼저 선언하십시오: "당시 핵심 과제는 ${focalTerm}의 한계 극복이었습니다. 저는 직접 ${secondaryTerm} 파라미터를 튜닝하여 결함률을 25% 저감하고 마진을 확보했습니다."처럼 구체적 숫자 2개와 본인만의 단독 액션을 강조해야 방어할 수 있습니다.`;

  return {
    starScores: {
      situation: Math.round(situationScore),
      task: Math.round(taskScore),
      action: Math.round(actionScore),
      result: Math.round(resultScore),
    },
    overallScore,
    strengths,
    weaknesses,
    feedbackComment,
    interviewerAttitude,
    isLastRound,
    nextQuestion,
    tailQuestionType,
    recommendedModelAnswerGuide,
    englishGrammarFixes: isEnglish
      ? [
          {
            original: 'I did the project with my team and it was good',
            improved: `I spearheaded the ${focalTerm} optimization alongside cross-functional engineers`,
            reason: 'Use strong ownership verbs and professional vocabulary rather than simple verbs.',
          },
        ]
      : undefined,
  };
}

// Dynamically generate the final comprehensive debrief report based on all rounds
export function generateReportDynamically(
  setup: InterviewSetup,
  allRounds: InterviewRound[],
  telemetry: {
    totalDurationSec: number;
    avgDurationSec: number;
    totalFillerCount: number;
    totalGazeOffCount: number;
    eyeContactScore: number;
  }
): FinalReportData {
  const roundScores = allRounds.map((r) => r.evaluation?.overallScore || 50);
  const avgRoundScore = Math.round(
    roundScores.reduce((a, b) => a + b, 0) / Math.max(1, roundScores.length)
  );

  // Extract all answer text across rounds for multi-round rigorous audit
  const allAnswers = allRounds.map((r) => r.candidateAnswer).join(' ');
  const metricMatches = allAnswers.match(/\d+(\.\d+)?(%|ms|s|초|분|배|건|개|원|억|만|nm|tps|v|w|a|k|℃|mtorr)?/gi) || [];
  const validMetrics = metricMatches.filter((m) => /\d/.test(m) && m.length >= 2);
  const totalMetrics = validMetrics.length;

  // Evasive counts across all rounds
  const evasiveKeywords = ['것 같', '인 것 같', '같습니다', '솔직히', '약간', '어쩌다', '그냥', '되게', '사실상', '팀원들이 다', '선임들이', '이것저것'];
  const totalEvasives = evasiveKeywords.reduce((acc, kw) => acc + (allAnswers.split(kw).length - 1), 0);

  // Derive 5-radar scores strictly (1-100)
  // 1. dataSpecificity: Extremely strict metric gate
  let dataSpecificity = 20;
  if (totalMetrics === 0) {
    dataSpecificity = 22; // Hard fail cutoff
  } else if (totalMetrics === 1) {
    dataSpecificity = 48; // Cutoff fail
  } else if (totalMetrics === 2) {
    dataSpecificity = 66;
  } else if (totalMetrics >= 4) {
    dataSpecificity = Math.min(94, 75 + totalMetrics * 4);
  } else {
    dataSpecificity = 74;
  }

  // 2. logicStructure: Penalized severely by evasive words
  const logicStructure = Math.min(94, Math.max(25, avgRoundScore + 2 - totalEvasives * 4));

  // 3. stressTolerance: Pressure recovery & gaze deviations
  const stressTolerance = Math.min(92, Math.max(25, 90 - telemetry.totalGazeOffCount * 6 - (telemetry.totalFillerCount > 6 ? 12 : 0)));

  // 4. jobCompetency: Domain depth
  const jobCompetency = Math.min(94, Math.max(25, avgRoundScore - (totalMetrics < 2 ? 10 : 0)));

  // 5. deliveryAndPresence: Professional non-verbal presence
  const deliveryAndPresence = Math.min(92, Math.max(25, telemetry.eyeContactScore - telemetry.totalFillerCount * 3));

  // Overall Weighted Score (Rigorous)
  const totalScore = Math.round(
    logicStructure * 0.25 +
    dataSpecificity * 0.25 +
    jobCompetency * 0.25 +
    stressTolerance * 0.15 +
    deliveryAndPresence * 0.10
  );

  // Strict Corporate Hiring Cutoff Evaluation (합격 하한선 80점 & 전 영역 58점 이상 과락 기준)
  const passThreshold = 80;
  const gapFromThreshold = totalScore - passThreshold;

  const cutoffWarnings: string[] = [];
  if (dataSpecificity < 58) {
    cutoffWarnings.push(`[과락] '구체성 및 수치 검증' 점수가 ${Math.round(dataSpecificity)}점으로 최소 합격 기준(58점)에 미달했습니다.`);
  }
  if (jobCompetency < 58) {
    cutoffWarnings.push(`[과락] '직무 전문성' 점수가 ${Math.round(jobCompetency)}점으로 실무 엔지니어링 기준(58점)에 미달했습니다.`);
  }
  if (logicStructure < 58) {
    cutoffWarnings.push(`[과락] '논리적 구성 및 체계' 점수가 ${Math.round(logicStructure)}점으로 모호한 회피성 표현이 과다합니다.`);
  }
  if (stressTolerance < 50) {
    cutoffWarnings.push(`[과락] '압박 대처력' 점수가 ${Math.round(stressTolerance)}점으로 꼬리 질문 방어에 실패했습니다.`);
  }

  let passVerdict: FinalReportData['passVerdict'] = '탈락 (No Hire)';
  let hiringDecisionNote = '';

  if (cutoffWarnings.length > 0) {
    passVerdict = '탈락 (No Hire)';
    hiringDecisionNote = `[채용 규정 과락 불합격] ${setup.company} 기술 심사 규정에 따라 5대 평가 영역 중 최소 요구 기준(58점) 미달 항목(${cutoffWarnings.length}개)이 발생하여 종합 점수와 무관하게 즉시 불합격 처리되었습니다.`;
  } else if (totalScore >= 88) {
    passVerdict = '합격 유력 (Strong Hire)';
    hiringDecisionNote = `[채용위원회 최종 합격 의결] 사내 기술 기준선(80점)을 ${totalScore - 80}점 상회하며, 상위 3% 최우수 엔지니어링 역량과 정량적 데이터 방어력을 입증하여 즉시 채용을 적극 권고합니다.`;
  } else if (totalScore >= 80) {
    passVerdict = '합격권 (Hire)';
    hiringDecisionNote = `[채용위원회 조건 충족 합격] 합격선(80점)을 통과하였으며, 직무 기본기와 문제 해결 로직이 실무 프로젝트에 즉시 투입 가능한 수준으로 판정되었습니다.`;
  } else if (totalScore >= 70) {
    passVerdict = '보류 (Borderline)';
    hiringDecisionNote = `[채용위원회 판정 보류] 점수가 70점대에 머물러 합격 최저선(80점)에 ${80 - totalScore}점 미달합니다. 타 지원자와의 치열한 경쟁 구도에서 탈락 위험이 높으며 2차 심층 면접 또는 기술 과제 재심사가 필요합니다.`;
  } else {
    passVerdict = '탈락 (No Hire)';
    hiringDecisionNote = `[채용위원회 최종 탈락 의결] 합격선(80점) 대비 ${80 - totalScore}점이 부족하여 실무 엔지니어링 역량 미달로 판정되었습니다. 정량적 지표 수치화와 단독 기여도 중심의 전면적인 재준비가 요구됩니다.`;
  }

  // Key Strengths & Critical Weaknesses
  const keyStrengths: string[] = [];
  const criticalWeaknesses: string[] = [];

  if (totalMetrics >= 3) {
    keyStrengths.push(`전체 라운드에 걸쳐 ${totalMetrics}개의 구체적인 정량적 수치 데이터(${validMetrics.slice(0, 3).join(', ')})를 일관되게 제시하여 주장의 기술적 신뢰성을 확보함.`);
  } else {
    criticalWeaknesses.push(`답변 전반에 검증 가능한 정량 지표(숫자 데이터)가 총 ${totalMetrics}개로 절대적으로 부족하여 엔지니어링 신뢰성을 증명하지 못함.`);
  }

  if (totalEvasives > 2) {
    criticalWeaknesses.push(`‘~인 것 같다’, ‘솔직히’ 등의 비전문적 추측/완곡 표현이 총 ${totalEvasives}회 감지되어 단호한 엔지니어링 의사결정 역량을 의심받음.`);
  } else {
    keyStrengths.push('불필요한 완곡 어법 없이 두괄식의 단호하고 명확한 기술적 결론을 제시함.');
  }

  if (telemetry.totalFillerCount > 4) {
    criticalWeaknesses.push(`습관적 말버릇(추임새)이 총 ${telemetry.totalFillerCount}회 집중 발생하여 면접관에게 심리적 불안정 신호를 노출함.`);
  } else {
    keyStrengths.push('말버릇 없이 정제된 전문 기술 용어 전달력으로 안정적인 면접 태도를 유지함.');
  }

  if (telemetry.totalGazeOffCount > 4) {
    criticalWeaknesses.push(`압박 질문을 받는 순간 시선 이탈(총 ${telemetry.totalGazeOffCount}회)이 발생하여 공격적 검증 상황에서의 시선 회피가 지적됨.`);
  } else {
    keyStrengths.push(`송곳 꼬리 질문에도 흔들림 없이 정면 주시율(${telemetry.eyeContactScore}%)을 유지하며 높은 압박 회복력을 보임.`);
  }

  if (keyStrengths.length < 3) {
    keyStrengths.push(`${setup.jobRole} 직무의 전공 도메인 기초 개념에 대한 이해와 구조화된 답변 구성.`);
  }
  if (criticalWeaknesses.length < 3) {
    criticalWeaknesses.push('공학적 성과 달성 시 수반되는 2차적 부작용(발열, 지연, 신뢰성 저하 등)에 대한 트레이드오프 방어책 미흡.');
  }

  const verdictSummary =
    totalScore >= 80 && cutoffWarnings.length === 0
      ? `${setup.company}의 엄격한 기술 심사 기준(80점)을 충족했습니다. 정량 데이터 기반의 문제 해결 능력과 논리적 인과관계가 돋보입니다.`
      : cutoffWarnings.length > 0
      ? `${setup.company}의 핵심 역량 과락 기준(58점 미만)에 걸려 최종 탈락 처리되었습니다. 부족한 지표 제시와 도메인 깊이를 근본적으로 보완해야 합니다.`
      : `${setup.company}의 실전 합격 하한선(80점)에 미달(총점 ${totalScore}점)하여 탈락권에 머물렀습니다. 답변의 정량화와 주도적 기여도를 보강하십시오.`;

  return {
    passVerdict,
    verdictSummary,
    passThreshold,
    gapFromThreshold,
    cutoffWarnings,
    hiringDecisionNote,
    radarScores: {
      logicStructure: Math.round(logicStructure),
      dataSpecificity: Math.round(dataSpecificity),
      stressTolerance: Math.round(stressTolerance),
      jobCompetency: Math.round(jobCompetency),
      deliveryAndPresence: Math.round(deliveryAndPresence),
    },
    totalScore,
    keyStrengths,
    criticalWeaknesses,
    speechAndHabitCritique:
      telemetry.totalFillerCount > 4
        ? `답변을 시작할 때 "어...", "솔직히" 대신 2초간 호흡을 가다듬고 "핵심 원인은 ~입니다"로 단언하십시오.`
        : `안정적인 발언 페이싱(평균 ${telemetry.avgDurationSec}초)과 우수한 시선 유지력을 보여주었습니다.`,
    actionPlan: [
      '모든 프로젝트 경험을 "숫자 3개(지표명, 기존치, 개선치)"로 치트시트 정리하기',
      '꼬리 질문 수신 시 변명 대신 "네, 지적하신 그 리스크에 대해..."로 즉시 팩트 제시하기',
      '카메라 렌즈를 응시하며 60초 내 STAR 결론 도출 훈련 반복',
    ],
    roundBreakdowns: allRounds.map((r) => ({
      roundNumber: r.roundNumber,
      coreTopic: r.intent,
      pressureTrigger: r.evaluation?.weaknesses?.[0] || '구체적 지표 검증',
      score: r.evaluation?.overallScore || 50,
      oneLineVerdict: r.evaluation?.feedbackComment || '답변 분석 완료',
    })),
    modeSpecificReport: {
      mode: setup.mode,
      title: setup.mode === 'debate' ? '토론 면접 공방 정밀 진단' : setup.mode === 'pt' ? 'PT 발표 및 맹점 방어력 진단' : 'Global English CEFR Assessment',
      highlightMetrics: [
        { label: '데이터 반영도', value: `${totalMetrics}개 지표`, assessment: totalMetrics >= 3 ? '충분한 수치 뒷받침' : '수치 부족 (감점 요인)' },
        { label: '아이컨택 안정도', value: `${telemetry.eyeContactScore}%`, assessment: telemetry.eyeContactScore >= 80 ? '안정적 주시' : '시선 불안정 (감점)' },
        { label: '말버릇 절제도', value: `${telemetry.totalFillerCount}회`, assessment: telemetry.totalFillerCount <= 3 ? '우수' : '절제 훈련 필수' },
      ],
      coachingAdvice: '지원자의 실제 발화 데이터에 기반한 실시간 맞춤 피드백입니다. 실제 면접장에서 수치와 본인 기여도를 전면에 배치하십시오.',
    },
  };
}

export interface InitialQuestionResult {
  question: string;
  intent: string;
  focusKeywords: string[];
  recommendedTimeSec: number;
  interviewerReaction: string;
}

// Persona & Role specific question banks with dynamic randomized rotation
const PERSONA_QUESTION_BANKS: Record<string, {
  questions: string[];
  intent: string;
  focusKeywords: string[];
  reaction: string;
  resumeQuestions: (resumeSnippet: string) => string[];
}> = {
  semi_master: {
    intent: '공정 수율 메커니즘 & 물리화학적 결함 해석 검증',
    focusKeywords: ['플라즈마 파라미터', '웨이퍼 수율', '결함 RCA', 'CD 산포'],
    reaction: '서류에서 눈을 떼지 않은 채 만년필을 쥐고 날카로운 눈빛으로 지원자를 응시함',
    questions: [
      'GAA(Gate-All-Around) 구조 도입 시 나노시트 단차 피복성과 채널 누설 전류를 억제하기 위해 공정 마진을 어떻게 확보하셨습니까?',
      '포토 및 에칭 공정 중 특정 웨이퍼 로트(Lot)에서 발생한 Critical Dimension(CD) 산포 불량의 근본 원인을 어떤 물리화학적 메커니즘으로 분석하셨습니까?',
      'High-k 유전체 박막 증착(ALD) 공정에서 박막 내 불순물 오염을 억제하고 계면 트랩 밀도를 최소화하기 위해 공정 챔버 온도를 어떤 열역학적 근거로 최적화하셨습니까?',
      'CMP(화학기계적 연마) 공정 후 발생하는 디싱(Dishing)과 침식(Erosion) 결함을 줄이기 위해 슬러리 조성과 연마 헤드 압력 프로파일을 어떻게 튜닝하셨습니까?',
      '초미세 공정에서 금속 배선(Interconnect)의 일렉트로마이그레이션(EM) 현상으로 인한 단선 리스크를 방지하기 위해 배선 단면적과 전류 밀도 마진을 어떻게 설계하셨습니까?',
      '양산 라인 시운전 중 웨이퍼 센터와 에지 간의 수율 편차가 10% 이상 벌어졌을 때, 척(Chuck) 온도 구배와 진공 배기 밸런스를 어떻게 조정하여 균일도를 회복하셨습니까?',
    ],
    resumeQuestions: (snippet) => [
      `제출하신 이력의 "${snippet}" 내용과 관련하여, 단순 실험 성공 외에 실제 양산 챔버 환경에서 플라즈마 상태 변화나 불순물 확산을 어떤 물리화학적 수식으로 모델링하셨습니까?`,
      `"${snippet}" 프로젝트를 진행하시면서 수율이나 물성을 개선했다고 하셨는데, 그 과정에서 발생한 부작용(예: 박막 응력, 파티클 결함)을 어떤 계측 장비(TEM/SEM)로 검증하셨습니까?`,
      `기재하신 "${snippet}" 성과에서 팀원이나 지도교수의 도움 없이 지원자가 순수하게 단독으로 설계하고 검증한 핵심 파라미터 마진은 정확히 얼마였습니까?`,
    ],
  },
  mobility_lead: {
    intent: '극한 환경 신뢰성 & ISO 26262 기능안전(Fail-safe) 압박',
    focusKeywords: ['페일세이프', '최악 조건 엣지케이스', 'ISO 26262', '제어 지연'],
    reaction: '팔짱을 낀 채 단호하고 냉철한 표정으로 지원자의 안전 설계 여유도를 주시함',
    questions: [
      '영하 40도 혹한기 노면에서 전륜 휠스피드 센서 1개가 일시적 신호 단절(Open Circuit)을 일으켰을 때, 당신이 짠 제어 로직은 차량 거동을 어떻게 페일세이프(Fail-safe) 상태로 유도합니까?',
      '차량용 인버터 모터 제어 시 급가속 상태에서 CAN/CAN-FD 통신 지연이나 패킷 드롭이 발생할 경우, 토크 명령 오버슈트를 방지하기 위한 소프트웨어 감시 알고리즘은 무엇입니까?',
      '이종 접합 차체 구조(알루미늄-초고장력강)에서 가혹 주행 조건 시 발생하는 전식(Galvanic Corrosion) 및 피로 내구성을 CAE 유한요소해석(FEA)으로 어떻게 사전 검증하셨습니까?',
      '회생제동과 유압 마찰제동 간의 협조제어(Cooperative Braking) 전환 구간에서 운전자가 이질감을 느끼지 않도록 제동 압력 응답성을 몇 ms 단위로 튜닝하셨습니까?',
      'ISO 26262 ASIL-D 요구사항을 충족하기 위해 메인 제어 루프의 MPU 메모리 보호 위반 시 안전 상태로 천이하는 와치독 모니터링 구조를 직접 구현해 보셨습니까?',
      '고출력 모터 및 배터리 팩 냉각을 위한 3D 열유동해석(CFD)에서 고속 주행 및 급속 충전 복합 모드 시 냉각수 유량 분배 편차를 몇 % 이내로 억제하셨습니까?',
    ],
    resumeQuestions: (snippet) => [
      `작성하신 "${snippet}" 성과를 보면 이상적인 조건에서의 테스트로 보입니다. 만약 센서 노이즈가 30% 증폭되거나 전원 전압이 드롭되는 가혹 환경에서도 이 로직이 100% 동작합니까?`,
      `"${snippet}" 구현 시 ISO 26262 기능안전 관점에서 단일 고장(Single Point Failure)이 발생했을 때 시스템 전체 다운을 막는 하드웨어/소프트웨어 여유도는 어떻게 설계하셨습니까?`,
      `이력서의 "${snippet}"에서 달성한 응답 속도가 실제 차량 ECU 양산 환경의 제한된 MCU 클럭과 CAN 버스 대역폭에서도 동일하게 재현될 수 있습니까?`,
    ],
  },
  battery_specialist: {
    intent: '열역학적 안전마진 & 소재 트레이드오프 검증',
    focusKeywords: ['열폭주 방지', '소재 트레이드오프', '급속충전 수명', 'SEI 피막'],
    reaction: '안경을 고쳐 쓰며 실험실 데이터와 양산 스케일업의 괴리를 집요하게 파고들 준비를 함',
    questions: [
      '하이니켈 양극재(Ni 90% 이상) 적용 시 사이클 진행에 따라 발생하는 양극재 입자 미세 크랙(Micro-cracking)과 산소 탈리 현상을 억제하기 위해 어떤 표면 코팅 및 도핑 전략을 채택하셨습니까?',
      '급속 충전 조건에서 음극 표면에 리튬 덴드라이트(Dendrite)가 석출되어 세퍼레이터를 관통하는 단락 위험을 차단하기 위해 충전 프로파일과 전압 컷오프를 어떻게 설계하셨습니까?',
      '에너지 밀도를 향상시키면서도 배터리 셀 열폭주(Thermal Runaway) 전파를 막기 위해 포기해야 했던 공학적 안전마진과 팩 레벨 방열 설계는 구체적으로 어떠했습니까?',
      '고전압 조건에서 전해액 분해로 인한 가스 발생(Swelling)을 억제하기 위해 사용한 기능성 첨가제 배합비와 SEI 피막 안정성 평가 결과를 수치로 제시해 주십시오.',
      '파우치형/원통형 셀 양산 공정에서 롤투롤(Roll-to-roll) 전극 코팅 시 로딩량 불균일도를 ± 몇 % 이내로 제어하여 국소 과충전 핫스팟을 방지하셨습니까?',
      '배터리 수명 예측 알고리즘 개발 시 실험실 25℃ 상온 데이터와 실제 혹서/혹한기 필드 데이터 간의 용량 열화(SOH) 오차를 어떤 보정 파라미터로 줄이셨습니까?',
    ],
    resumeQuestions: (snippet) => [
      `기재하신 "${snippet}" 내용에서 에너지 밀도나 용량을 올리셨다고 했는데, 그로 인해 희생된 열 안정성 마진(온도 상승치)과 수명 열화율은 구체적으로 몇 %였습니까?`,
      `"${snippet}" 프로젝트 진행 시 실험실 1개 코인셀(Coin cell)에서의 성공 결과를 10만 개 단위 양산 파우치/원통형 셀로 스케일업할 때 발생하는 열 방출 편차는 어떻게 시뮬레이션하셨습니까?`,
      `제출하신 "${snippet}"에서 전해액이나 활물질 조성을 변경할 때 발생할 수 있는 가스 발생(Swelling) 및 내부 저항(IR) 증가 트레이드오프를 어떻게 측정하셨습니까?`,
    ],
  },
  kernel_master: {
    intent: '하드웨어 I/O 한계치 & 로우레벨 동시성 검증',
    focusKeywords: ['커널 I/O 스케줄링', '락 경합(Lock)', '분산 합의', '캐시 라인'],
    reaction: '노트북 터미널 화면을 두드리며 로우레벨 시스템 아키텍처의 팩트체크를 준비함',
    questions: [
      '대규모 동시성 I/O 트래픽 발생 시 리눅스 커널의 컨텍스트 스위칭 오버헤드와 락 경합(Lock Contention)을 줄이기 위해 어떤 메모리 구조와 비동기 I/O(io_uring/epoll) 모델을 설계하셨습니까?',
      '분산 시스템에서 네트워크 파티션 발생 시 CAP 정리 관점에서 데이터 일관성(Consistency)과 가용성(Availability)의 트레이드오프를 어떤 정족수(Quorum) 알고리즘으로 해결하셨습니까?',
      'CPU 캐시 라인 거짓 공유(False Sharing)로 인한 멀티코어 성능 저하 문제를 진단하고, 데이터 구조 패딩(Padding)과 캐시 정렬을 통해 처리량을 몇 % 개선하셨습니까?',
      '고빈도 트랜잭션 파이프라인에서 가비지 컬렉션(GC)이나 메모리 할당 병목을 우회하기 위해 오프힙(Off-heap) 버퍼 또는 제로카피(Zero-copy) 전송을 어떻게 구현하셨습니까?',
      '분산 메시지 브로커 연동 시 노드 장애 상황에서 메시지 유실(At-least-once vs Exactly-once)과 종단간 지연(Latency)의 균형을 어떻게 맞추셨습니까?',
      'P99 레이턴시가 갑자기 500ms 이상으로 튀는 스파이크 현상이 발생했을 때, OS 프로파일러(perf/ebpf)를 사용해 어떤 시스템 콜 또는 I/O 병목을 근본 원인으로 밝혀내셨습니까?',
    ],
    resumeQuestions: (snippet) => [
      `"${snippet}" 프로젝트에서 고수준 프레임워크 뒤에 감춰진 OS 커널 레벨의 컨텍스트 스위칭 수와 시스템 콜 비용을 직접 프로파일링해 보셨습니까?`,
      `기재하신 "${snippet}" 시스템에서 트래픽이 평소 대비 10배 폭증하거나 DB 커넥션이 고갈될 때, 메모리 누수 없이 가용성을 유지하기 위해 어떤 백프레셔(Backpressure)를 설계하셨습니까?`,
      `"${snippet}" 아키텍처에서 노드 간 네트워크 파티션이나 스플릿 브레인(Split-brain) 발생 시 데이터 불일치를 감지하고 복구하는 로직은 구체적으로 어떻게 동작합니까?`,
    ],
  },
};

// Dynamic Opening Question Generator ensuring Persona uniqueness and re-run variation
export function getOpeningQuestionForPersona(
  setup: InterviewSetup,
  randomSeed?: number
): InitialQuestionResult {
  const seed = randomSeed ?? Date.now();
  const timeLimit = setup.timeLimitPerQuestionSec || 90;
  const personaId = setup.interviewerPersona?.id || 'semi_master';
  const mode = setup.mode || 'general';

  if (mode === 'debate') {
    const debate = setup.debateSetup;
    const opponent = debate?.opponentName || '상대측 토론자';
    const topic = debate?.topic || '핵심 공학 기술 의제';
    const stance = debate?.assignedStance || '찬성';
    const otherStance = stance === '찬성' ? '반대' : '찬성';

    const debateQuestions = [
      `"${topic}"에 대해 저는 확고한 ${otherStance} 입장입니다. 지원자께서 주장하시는 ${stance} 입장은 초기 막대한 인프라 전환 비용과 현장 안정성 리스크를 지나치게 낙관하고 있습니다. ${stance}측의 핵심 논거와 지속 가능한 대안을 먼저 데이터로 제시해 주십시오.`,
      `토론 주제 "${topic}"에 대해 ${otherStance}측 패널로서 반론을 제기합니다. 지원자가 지지하는 ${stance} 방향은 실제 양산 현장의 품질 편차와 안전 마진을 무시한 이론적 가설에 불과합니다. 이를 반박할 객관적 실증 수치는 무엇입니까?`,
      `"${topic}" 토론을 시작하며 ${stance}측 지원자께 묻습니다. 귀측의 논리는 단기적 효율성만 강조할 뿐, 시스템 전체의 신뢰성 붕괴 시 발생할 천문학적 손실에 대한 방어책이 전무합니다. 왜 우리가 굳이 ${stance} 방식을 채택해야 합니까?`,
    ];
    const pick = debateQuestions[Math.abs(seed) % debateQuestions.length];
    return {
      question: pick,
      intent: '토론 쟁점 장악력 및 기조 반박 논리 검증',
      focusKeywords: ['기조 논증', '데이터 팩트', '상대 반박'],
      recommendedTimeSec: timeLimit,
      interviewerReaction: `${opponent}가 날카로운 눈빛으로 지원자의 기조 발표를 주시함`,
    };
  }

  if (mode === 'pt') {
    const pt = setup.ptSetup;
    const caseTitle = pt?.caseTitle || '핵심 공학 기술 과제';
    const ptQuestions = [
      `과제 "${caseTitle}"에 대한 기술 분석을 마치셨습니까? 핵심 문제 정의, 도출한 공학 솔루션, 기대되는 정량적 ROI를 3분 내로 두괄식 발표해 주십시오. 발표 직후 심사위원단의 맹점 질의가 이어집니다.`,
      `PT 면접 세션을 개시합니다. "${caseTitle}" 브리핑 자료의 데이터 포인트를 바탕으로, 제약 조건 내에서 6개월 내 골든 스펙을 돌파할 실행 로드맵을 3분간 구조화하여 프레젠테이션해 주십시오.`,
      `심사위원장으로서 발표를 요청합니다. "${caseTitle}"에서 제시된 병목 지표를 개선하기 위한 3단계 핵심 전략과 발생 가능한 트레이드오프 방어책을 3분 내로 발표하십시오.`,
    ];
    const pick = ptQuestions[Math.abs(seed) % ptQuestions.length];
    return {
      question: pick,
      intent: '비즈니스 및 공학 케이스 문제 정의 및 핵심 전략 발표',
      focusKeywords: ['문제 정의', '해결 전략', '기대 ROI'],
      recommendedTimeSec: setup.timeLimitPerQuestionSec || 180,
      interviewerReaction: '심사위원단이 발표 타이머를 시작하고 냉정한 태도로 평가표를 작성하기 시작함',
    };
  }

  if (mode === 'english') {
    const englishQuestions = [
      `Welcome to the global technical interview at ${setup.company}. Could you please walk me through the most technically rigorous problem you solved in your ${setup.jobRole || 'engineering'} track, highlighting your quantifiable metric outcome?`,
      `Could you detail a critical technical bottleneck you personally identified and resolved in your recent engineering projects, and explain the architectural tradeoffs you evaluated?`,
      `In a high-stakes engineering environment, how do you defend your technical proposals against aggressive cross-functional skepticism? Please illustrate with a real engineering case study.`,
      `Please describe a system failure or yield drop you experienced in production. How did you conduct root cause analysis under time pressure, and what engineering controls did you implement?`,
    ];
    const pick = englishQuestions[Math.abs(seed) % englishQuestions.length];
    return {
      question: pick,
      intent: 'Global Technical Leadership & Metric Delivery',
      focusKeywords: ['Tradeoff', 'Root Cause', 'Quantifiable Metrics'],
      recommendedTimeSec: timeLimit,
      interviewerReaction: 'Interviewer maintains steady eye contact, evaluating articulation and technical precision',
    };
  }

  // General Interview Mode: Persona tailored
  const bank = PERSONA_QUESTION_BANKS[personaId] || PERSONA_QUESTION_BANKS['semi_master'];
  const resumeText = setup.customResumeOrProject?.trim();

  let question = '';
  if (resumeText && resumeText.length >= 10) {
    const snippet = resumeText.length > 35 ? `${resumeText.slice(0, 35)}...` : resumeText;
    const resumeChoices = bank.resumeQuestions(snippet);
    question = resumeChoices[Math.abs(seed) % resumeChoices.length];
  } else {
    question = bank.questions[Math.abs(seed) % bank.questions.length];
  }

  return {
    question,
    intent: bank.intent,
    focusKeywords: bank.focusKeywords,
    recommendedTimeSec: timeLimit,
    interviewerReaction: bank.reaction,
  };
}

