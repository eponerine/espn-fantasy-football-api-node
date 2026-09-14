export function jsonParsing(obj, key) {
  const results = [];

  function extract(value) {
    if (Array.isArray(value)) {
      for (const item of value) {
        extract(item);
      }
      return;
    }

    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        const isNestedArray = Array.isArray(v) && v.length > 0 && typeof v[0] === 'object';
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          extract(v);
        } else if (isNestedArray) {
          extract(v);
        } else if (k === key) {
          results.push(v);
        }
      }
    }
  }

  extract(obj);
  return results.length ? results[0] : results;
}

export function squareMatrix(matrix) {
  const size = matrix.length;
  const out = Array.from({ length: size }, () => Array.from({ length: size }, () => 0.0));

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      for (let k = 0; k < size; k += 1) {
        out[i][j] += matrix[i][k] * matrix[k][j];
      }
    }
  }

  return out;
}

export function addMatrix(a, b) {
  const size = a.length;
  const out = Array.from({ length: size }, () => Array.from({ length: size }, () => 0.0));

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      out[i][j] = a[i][j] + b[i][j];
    }
  }

  return out;
}

export function twoStepDominance(matrix) {
  const summed = addMatrix(squareMatrix(matrix), matrix);
  return summed.map((row) => row.reduce((acc, value) => acc + value, 0));
}

export function powerPoints(dominance, teams, week) {
  const resolvedWeek = week <= 0 ? 1 : week;
  const points = [];

  for (let i = 0; i < dominance.length; i += 1) {
    const team = teams[i];
    const avgScore = team.scores.slice(0, resolvedWeek).reduce((acc, v) => acc + v, 0) / resolvedWeek;
    const avgMov = team.mov.slice(0, resolvedWeek).reduce((acc, v) => acc + v, 0) / resolvedWeek;
    const power = ((Math.trunc(dominance[i]) * 0.8) + (Math.trunc(avgScore) * 0.15) + (Math.trunc(avgMov) * 0.05)).toFixed(2);
    points.push(power);
  }

  return points
    .map((power, index) => [power, teams[index]])
    .sort((a, b) => Number(b[0]) - Number(a[0]));
}
