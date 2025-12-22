import { Navbar, Footer, Background } from './components/layout';
import { Hero, About, Skills, Projects, Contact } from './components/sections';
import './styles/globals.css';

function App() {
  return (
    <>
      <Background />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

export default App;
