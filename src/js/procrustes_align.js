// aligns pointSet1 to pointSet2
// each pointSet is an array of points
// each point is an array with two elements representing the point's x and y values
// e.g. [ [x1, y1], [x2, y2] ]
function procrustesAlign(pointSet1, pointSet2) {
  const mean1 = calcMean(pointSet1);
  const mean2 = calcMean(pointSet2);

  let points1 = subtractFromPoints(pointSet1, mean1);
  let points2 = subtractFromPoints(pointSet2, mean2);

  const s1 = calcSumOfSquaredDistance(points1);
  const s2 = calcSumOfSquaredDistance(points2);
  const scaleFactor = s2 / s1;
  points1 = scalePoints(points1, scaleFactor);

  // A = sum_i(x1[i] * y2[i] - y1[i] * x2[i])
  let A = 0;
  for (let i = 0; i < points1.length; i++) {
    A += points1[i][0] * points2[i][1] - points1[i][1] * points2[i][0];
  }

  // B = sum_i(x1[i] * x2[i] + y1[i] * y2[i])
  let B = 0;
  for (let i = 0; i < points1.length; i++) {
    B += points1[i][0] * points2[i][0] + points1[i][1] * points2[i][1];
  }

  const rotationAngle = Math.atan2(A, B);
  points1 = rotatePoints(points1, rotationAngle);

  points1 = addToPoints(points1, mean2);

  return points1;
}

// calculates the mean of a pointSet
// returns array with two elements representing the mean of the set's x and y values
function calcMean(pointSet) {
  const xSum = pointSet
    .map(point => point[0])             // creates new array with only the x values of each point
    .reduce((a, b) => a + b, 0);        // sums all the values in mapped array
  const xMean = xSum / pointSet.length; // divides sum by the number of points to calculate mean

  const ySum = pointSet
    .map(point => point[1])             // as above but for y values
    .reduce((a, b) => a + b, 0);
  const yMean = ySum / pointSet.length;

  return [xMean, yMean];
}

function subtractFromPoints(pointSet, subtractValues) {
  return pointSet.map((point) => {
    const x = point[0] - subtractValues[0];
    const y = point[1] - subtractValues[1];
    return [x, y];
  });
}

function addToPoints(pointSet, addValues) {
  return pointSet.map((point) => {
    const x = point[0] + addValues[0];
    const y = point[1] + addValues[1];
    return [x, y];
  });
}

function calcSumOfSquaredDistance(pointSet) {
  let sum = 0;
  for (let point of pointSet) {
    sum += point[0] * point[0] + point[1] * point[1];
  }
  return sum;
}

function scalePoints(pointSet, scaleFactor) {
  const scaledPointSet = pointSet.map((point) => {
    const x = point[0] * scaleFactor;
    const y = point[1] * scaleFactor;
    return [x, y];
  });
  return scaledPointSet;
}

// @param a - rotation angle
function rotatePoints(pointSet, a) {
  const rotatedPoints = pointSet.map((point) => {
    const x = Math.cos(a) * point[0] - Math.sin(a) * point[1];
    const y = Math.sin(a) * point[0] + Math.cos(a) * point[1];
    return [x, y];
  });
  return rotatedPoints;
}

export default procrustesAlign;
