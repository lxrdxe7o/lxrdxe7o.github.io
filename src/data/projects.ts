// ═══════════════════════════════════════════════════════════════════════════
//  Projects Data - Add/edit projects here
// ═══════════════════════════════════════════════════════════════════════════

import type { Project } from '../types';

export const projects: Project[] = [
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
    id: 'hachi',
    title: 'Hachi',
    icon: '🐝',
    description: 'A powerful, modular utility tool designed for efficiency and speed. Features advanced automation capabilities and seamless system integration.',
    tags: ['Rust', 'CLI'],
    accentTag: 'System',
    features: [
      '⚡ Blazing fast execution',
      '🔌 Modular plugin architecture',
      '🛠️ extensive system control'
    ],
    github: 'https://github.com/lxrdxe7o/hachi',
    featured: false
  },
  {
    id: 'xero-shell',
    title: 'Xero Shell',
    icon: '🐚',
    description: 'A custom, lightweight shell environment designed for power users. Features advanced auto-completion, syntax highlighting, and a plugin system.',
    tags: ['C', 'Shell'],
    accentTag: 'Terminal',
    features: [
      '🎨 Custom syntax highlighting',
      '🚀 Advanced auto-completion',
      '🔌 Plugin system support'
    ],
    github: 'https://github.com/lxrdxe7o/xero-shell',
    featured: false
  },
  {
    id: 'deaddrop',
    title: 'DeadDrop',
    icon: '🔒',
    description: 'A cyber-minimalist secure file sharing platform featuring 3D encryption mesh visualization and end-to-end encryption.',
    tags: ['Next.js', 'Three.js', 'Crypto'],
    accentTag: 'Security',
    features: [
      '🔒 End-to-End Encryption',
      '🕸️ 3D Mesh Visualization',
      '⏱️ Ephemeral generic storage'
    ],
    github: 'https://github.com/lxrdxe7o/DeadDrop',
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
