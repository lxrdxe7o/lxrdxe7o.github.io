# Projects Page Background Scene

## Goal
Implement a premium, CSS-animated HTML digital data background scene (`BackgroundScene`) for the `/projects` page, replacing the heavy WebGL Canvas scene.

## Tasks
- [x] Task 1: Create `src/components/scenes/presets/BackgroundScene.tsx` with the user's provided component. → Verify: File created.
- [x] Task 2: Create `src/components/scenes/presets/BackgroundScene.css` with styling for `.scene`, `.floor`, `.main-column`, `.light-stream-container`, and `.light-beam` featuring premium orange-accented digital streams and synchronized animations. → Verify: CSS file created and imported.
- [x] Task 3: Update `src/components/scenes/SceneEngine.tsx` to conditionally render `BackgroundScene` outside the WebGL `<Canvas>` when the route is `/projects`. → Verify: `SceneEngine` handles HTML-based scenes correctly.
- [x] Task 4: Validate the build, check the UI in dev, and ensure no lint errors. → Verify: `npm run build` passes successfully.

## Done When
- [x] Projects page features the animated digital data background.
- [x] Beams animate with synchronized rise, fade, and drop pulse effects.
- [x] Visual style is premium and matches the orange accent color of `/projects`.
- [x] Build passes without any TypeScript or compile errors.
