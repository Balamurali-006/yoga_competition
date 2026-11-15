export const getCompleteScoreTotal = (scores) => {
  if (!Array.isArray(scores) || scores.length !== 5) return null;
  if (scores.some((score) => !Number.isFinite(score) || score < 0 || score > 10)) return null;
  return Math.round(scores.reduce((total, score) => total + score, 0) * 100) / 100;
};

export const getPrizeForScore = (score) => {
  if (!Number.isFinite(score) || score < 0 || score > 50) return "";
  if (score >= 40) return "1st Prize";
  if (score > 30) return "2nd Prize";
  return "3rd Prize";
};
