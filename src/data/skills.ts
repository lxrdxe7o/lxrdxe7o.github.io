import type { Fact } from './facts';
import { approvedFact } from './editorial';

export interface CapabilityEvidence {
  label: string;
  href: string;
}

export interface Capability {
  name: string;
  context: string;
  evidence: readonly CapabilityEvidence[];
  fact: Fact<string>;
}

export interface CapabilityGroup {
  title: string;
  capabilities: readonly Capability[];
}

export const capabilityGroups: readonly CapabilityGroup[] = [
  {
    title: 'Web publishing',
    capabilities: [
      {
        name: 'TypeScript and Next.js',
        context: 'Used for the Xero.dev publishing platform.',
        evidence: [{ label: 'Xero.dev repository', href: 'https://github.com/lxrdxe7o/xero.dev' }],
        fact: approvedFact('TypeScript and Next.js are recorded for Xero.dev', 'src/content/projects/xero-dev.mdx'),
      },
    ],
  },
  {
    title: 'Developer tooling',
    capabilities: [
      {
        name: 'Lua and Neovim',
        context: 'Used to build and maintain the KrakenVim configuration distribution.',
        evidence: [{ label: 'KrakenVim repository', href: 'https://github.com/lxrdxe7o/KrakenVim' }],
        fact: approvedFact('Lua and Neovim are recorded for KrakenVim', 'src/content/projects/krakenvim.mdx'),
      },
      {
        name: 'Linux and workstation configuration',
        context: 'Applied through a GNU Stow-managed dotfiles repository covering Hyprland and Wayland.',
        evidence: [{ label: 'Dotfiles repository', href: 'https://github.com/lxrdxe7o/dotfiles' }],
        fact: approvedFact('Linux, Hyprland, Wayland, and GNU Stow are recorded for Dotfiles', 'src/content/projects/dotfiles.mdx'),
      },
    ],
  },
  {
    title: 'Terminal and systems work',
    capabilities: [
      {
        name: 'Rust terminal interfaces',
        context: 'Used for Hachi, a terminal interface for asusctl.',
        evidence: [{ label: 'Hachi repository', href: 'https://github.com/lxrdxe7o/hachi' }],
        fact: approvedFact('Rust and terminal UI work are recorded for Hachi', 'src/content/projects/hachi.mdx'),
      },
      {
        name: 'C applications',
        context: 'Used in DeadDrop and Shiro Nekoo 115.',
        evidence: [
          { label: 'DeadDrop repository', href: 'https://github.com/lxrdxe7o/DeadDrop' },
          { label: 'Shiro Nekoo 115 repository', href: 'https://github.com/lxrdxe7o/shiro-nekoo-115' },
        ],
        fact: approvedFact('C is recorded for DeadDrop and Shiro Nekoo 115', 'src/content/projects/deaddrop.mdx'),
      },
    ],
  },
];

export const toolbox = [...new Set(capabilityGroups.flatMap((group) => group.capabilities.map((capability) => capability.name)))];
