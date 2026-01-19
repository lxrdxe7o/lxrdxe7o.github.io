import Scene3D from '@components/three/Scene3D'
import Hero from '@components/sections/Hero'
import About from '@components/sections/About'
import Projects from '@components/sections/Projects'
import Contact from '@components/sections/Contact'

function App() {
  return (
    <>
      <Scene3D />
      <main className="content">
        <Hero />
        <About />
        <Projects />
        <Contact />
      </main>
    </>
  )
}

export default App
