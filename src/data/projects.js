// ═══════════════════════════════════════════════════════════════════════════
//  Projects Data - Add/edit projects here
// ═══════════════════════════════════════════════════════════════════════════

export const projects = [
  {
    id: 'krakenvim',
    title: 'KrakenVim',
    icon: '🐙',
    description: 'A from-scratch Neovim configuration with 15+ themes, full LSP support for 15+ languages, DAP debugging, and sub-50ms startup time. Features AI-powered completion, Git integration, and Pomodoro timer.',
    tags: ['Lua', 'Neovim'],
    accentTag: 'Neovim',
    features: [
      '⚡ Lazy loading with blazing fast startup',
      '🎨 Persistent colorscheme picker',
      '🤖 GitHub Copilot integration'
    ],
    github: 'https://github.com/lxrdxe7o/KrakenVim',
    featured: false
  },
  {
    id: 'quantum-airways',
    title: 'Quantum Airways',
    icon: '✈️',
    description: 'A quantum-secure airline booking system implementing Post-Quantum Cryptography (PQC) with Kyber-512, Dilithium3, and QRNG to protect against future quantum threats.',
    tags: ['Python', 'TypeScript'],
    accentTag: 'PQC',
    features: [
      '🛡️ NIST FIPS 203 & 204 compliant',
      '🐳 Full Docker containerization',
      '🌐 Modern Vite + Flask stack'
    ],
    github: 'https://github.com/lxrdxe7o/tora-neko-311',
    featured: false
  },
  {
    id: 'hospital-management',
    title: 'Hospital Management System',
    icon: '🏥',
    description: 'A high-performance, modular C application for hospital management featuring a professional ncurses-based TUI with custom memory management, binary data persistence, and visual themes.',
    tags: ['C'],
    accentTag: 'ncurses',
    features: [
      '🎮 Professional TUI interface',
      '💾 Custom core library in C11',
      '📊 Patient, Doctor & Ward management'
    ],
    github: 'https://github.com/lxrdxe7o/shiro-nekoo-115',
    featured: false
  },
  {
    id: 'vehicle-shop',
    title: 'Vehicle Shop System',
    icon: '🚗',
    description: 'A modern JavaFX vehicle management system featuring a stunning dark aesthetic with animated backgrounds, floating geometric shapes, and seamless data persistence.',
    tags: ['Java'],
    accentTag: 'JavaFX',
    features: [
      '🎨 Custom animated backgrounds',
      '✨ AtlantaFX Dracula theme',
      '🔍 Advanced live filtering'
    ],
    github: 'https://github.com/lxrdxe7o/kuro-nekoo-215',
    featured: false
  },
  {
    id: 'mikeneko',
    title: 'Mikeneko',
    icon: '🎵',
    description: 'A production-ready, high-performance Discord music bot built with TypeScript, discord.js v14, and Lavalink v4 for high-quality audio streaming.',
    tags: ['TypeScript'],
    accentTag: 'Discord.js',
    features: [
      '🎧 YouTube, Spotify, SoundCloud & more',
      '🐳 Complete Docker Compose setup',
      '🔄 Automatic reconnection logic'
    ],
    github: 'https://github.com/lxrdxe7o/mikeneko',
    featured: false
  },
  {
    id: 'dotfiles',
    title: 'Dotfiles',
    icon: '⚙️',
    description: 'My current collection of configuration files managed with GNU Stow. Includes Hyprland, zsh, and various other Linux customizations for a refined desktop experience.',
    tags: ['Shell'],
    accentTag: 'GNU Stow',
    features: [
      '🐧 Arch Linux optimized',
      '📂 Modular GNU Stow structure',
      '🎨 Cohesive visual aesthetics'
    ],
    github: 'https://github.com/lxrdxe7o/dotfiles',
    featured: false
  }
];
