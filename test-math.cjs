let targetIndexFloat = 0;
let currentIndex = 0;
const total = 9;

function handleWheel(deltaY) {
  const isTrackpad = Math.abs(deltaY) < 40;
  const sensitivity = isTrackpad ? 0.0015 : 0.001;
  targetIndexFloat += deltaY * sensitivity;
  
  let nextIndex = Math.round(targetIndexFloat) % total;
  if (nextIndex < 0) nextIndex += total;
  
  if (isNaN(nextIndex)) {
    console.log('NAN!', targetIndexFloat);
  }
  
  if (nextIndex !== currentIndex) {
    currentIndex = nextIndex;
    return currentIndex;
  }
  return null;
}

// simulate scrolling
for (let i = 0; i < 5000; i++) {
  const next = handleWheel(100);
  if (next === 0 && targetIndexFloat > 1) {
    console.log('Wrapped to 0 at float:', targetIndexFloat);
  }
}
