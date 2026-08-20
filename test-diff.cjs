let targetProgress = 0;
const total = 9;

function scrollToIndex(index) {
  let diff = index - (targetProgress % total);
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  targetProgress += diff;
  return targetProgress;
}

console.log(scrollToIndex(8)); // 0 to 8 -> should go backward to -1
console.log(scrollToIndex(7)); // -1 to 7 -> should go backward to -2
console.log(scrollToIndex(6)); // -2 to 6 -> should go backward to -3
console.log(scrollToIndex(5)); // -3 to 5 -> should go backward to -4
console.log(scrollToIndex(4)); // -4 to 4 -> should go backward to -5
