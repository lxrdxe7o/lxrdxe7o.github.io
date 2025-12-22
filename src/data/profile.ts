// ═══════════════════════════════════════════════════════════════════════════
//  Profile Data - Edit your info here
// ═══════════════════════════════════════════════════════════════════════════

import type { Profile } from '../types';

export const profile: Profile = {
  name: 'xero',
  roles: [
    'Full-Stack Developer',
    'Linux Enthusiast',
    'Problem Solver',
    'Open Source Advocate'
  ],
  tagline: 'Building modern, performant, and scalable applications.',
  description: 'From custom Neovim configs to quantum-secure systems.',
  github: 'https://github.com/lxrdxe7o',
  githubUsername: '@lxrdxe7o',
  
  about: {
    paragraphs: [
      'Passionate developer focused on building modern, performant, and scalable applications. I specialize in creating elegant solutions to complex problems, from full-stack web applications to system-level tools and Discord bots.',
      "When I'm not coding, you'll find me customizing my Linux setup, perfecting my Neovim configuration, or exploring new technologies. I believe in clean code, open source, and the power of the terminal."
    ],
    stats: [
      { number: '6+', label: 'Featured Projects' },
      { number: '5+', label: 'Languages' },
      { number: '∞', label: 'Curiosity' }
    ]
  },

  codePreview: {
    title: '~/portfolio',
    code: `const developer = {
  name: "xero",
  passions: ["Linux", "Neovim", "Open Source"],
  motto: "Code with purpose 🐙"
};`
  }
};
