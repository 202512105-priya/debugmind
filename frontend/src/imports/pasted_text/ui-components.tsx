import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = 'login' | 'projects' | 'workspace'
type WorkspaceTab =
  | 'overview' | 'repositories' | 'logs' | 'source'
  | 'chunks' | 'embeddings' | 'git-diff'
  | 'analysis' | 'report' | 'report-history' | 'trace'

// ─── Primitives ───────────────────────────────────────────────────────────────
type BV = 'default' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate' | 'orange'

function Badge({ label, variant = 'default', dot }: { label: string; variant?: BV; dot?: boolean }) {
  const s: Record<BV, string> = {
    default: 'bg-slate-100 text-slate-600 border-slate-200',
    blue:    'bg-blue-50 text-blue-700 border-blue-200',
    green:   'bg-green-50 text-green-700 border-green-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    red:     'bg-red-50 text-red-700 border-red-200',
    purple:  'bg-violet-50 text-violet-700 border-violet-200',
    slate:   'bg-slate-800 text-slate-200 border-slate-700',
    orange:  'bg-orange-50 text-orange-700 border-orange-200',
  }
  const d: Record<BV, string> = {
    default: 'bg-slate-400', blue: 'bg-blue-500', green: 'bg-green-500',
    amber: 'bg-amber-500', red: 'bg-red-500', purple: 'bg-violet-500',
    slate: 'bg-slate-400', orange: 'bg-orange-500',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium whitespace-nowrap ${s[variant]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${d[variant]}`}/>}
      {label}
    </span>
  )
}

function Btn({ children, variant = 'primary', size = 'sm', onClick, icon, disabled, className = '' }: {
  children?: React.ReactNode; variant?: 'primary'|'secondary'|'ghost'|'danger'
  size?: 'xs'|'sm'|'md'; onClick?: () => void; icon?: React.ReactNode
  disabled?: boolean; className?: string
}) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-md transition-all border cursor-pointer select-none'
  const sizes = { xs: 'px-2 py-1 text-[11px]', sm: 'px-3 py-1.5 text-[12px]', md: 'px-4 py-2 text-sm' }
  const vs = {
    primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm',
    secondary: 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm',
    ghost: 'bg-transparent text-slate-600 border-transparent hover:bg-slate-100',
    danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-sm',
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${vs[variant]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  )
}

function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick}
      className={`bg-white border border-slate-200 rounded-lg ${onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all' : ''} ${className}`}>
      {children}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const I = {
  grid:     () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/></svg>,
  folder:   () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3.5A1 1 0 012 2.5h3l1 1h5a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1v-6z" stroke="currentColor" strokeWidth="1.4"/></svg>,
  log:      () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M2 7h10M2 10h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  report:   () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="1" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M4 5h6M4 7.5h6M4 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  gear:     () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.8 2.8l1 1M10.2 10.2l1 1M2.8 11.2l1-1M10.2 3.8l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  search:   () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8.5 8.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  plus:     () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  chevR:    () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2.5L8 6l-4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevD:    () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4L6 8l3.5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  check:    () => <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2.5L8 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  upload:   () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2.5v7M4.5 5L7 2.5 9.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  play:     () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 2l7 4-7 4V2z" fill="currentColor"/></svg>,
  copy:     () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="3.5" y="3.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M1 8.5V2a1 1 0 011-1h6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  ext:      () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M6.5 1H10v3.5M10 1L5 6M2 3H1v7h7V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  warn:     () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5L12 11.5H1L6.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M6.5 5v3.5M6.5 9.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  code:     () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 4L1.5 7l3 3M9.5 4l3 3-3 3M6.5 10.5l1-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  stack:    () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2L13 5.5 7 9 1 5.5 7 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M1 8.5L7 12l6-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  pulse:    () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7h2.5l2-4 2.5 8 2-5 1.5 1H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  git:      () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="4" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="4" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="10" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 5v4M5.5 3.5h3a1.5 1.5 0 011.5 1.5v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  team:     () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 12a4 4 0 018 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="10.5" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M12.5 12a3 3 0 00-4-2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  bell:     () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5A4 4 0 003 5.5v3H11v-3A4 4 0 007 1.5z" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 8.5v1a1.5 1.5 0 003 0v-1" stroke="currentColor" strokeWidth="1.3"/></svg>,
  embed:    () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="3" cy="7" r="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="11" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="11" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 7h3.5M5 6.5l4.5-2M5 7.5l4.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  analysis: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4v4l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chunk:    () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>,
  gh: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>,
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function GlobalSidebar({ onProject, onNavGlobal, activeGlobal }: {
  onProject: () => void; onNavGlobal: (id: string) => void; activeGlobal: string
}) {
  const recent = ['payments-api', 'inventory-service', 'auth-service']
  const globalNav = [
    { id: 'overview-g', label: 'Dashboard', icon: I.grid },
    { id: 'analysis-g', label: 'Analysis Runs', icon: I.analysis },
    { id: 'reports-g', label: 'Reports', icon: I.report },
    { id: 'logs-g', label: 'Recent Logs', icon: I.log },
    { id: 'repos-g', label: 'Repositories', icon: I.folder },
    { id: 'settings-g', label: 'Settings', icon: I.gear },
  ]
  return (
    <aside className="flex flex-col w-[220px] shrink-0 min-h-screen bg-slate-900">
      {/* Logo + search */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center shrink-0">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" stroke="white" strokeWidth="1.5"/><path d="M4 6l1.5 1.5L8.5 4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="text-white font-semibold text-[13px] tracking-tight">DebugMind</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5">
          <I.search/><span className="text-slate-500 text-[12px]">Search... ⌘K</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-auto">
        <NavLink label="Projects" icon={I.folder} active={activeGlobal === 'projects'} onClick={() => onNavGlobal('projects')}/>
        <NavLink label="Favorites" icon={I.report} active={false} onClick={() => {}}/>
        <div className="mt-3 mb-1 px-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Recent</div>
        {recent.map(name => (
          <button key={name} onClick={onProject}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-slate-500 hover:text-slate-200 hover:bg-slate-800 w-full text-left truncate transition-colors">
            <I.folder/><span className="truncate">{name}</span>
          </button>
        ))}
        <div className="mt-3 mb-1 px-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Global</div>
        {globalNav.map(item => (
          <NavLink key={item.id} label={item.label} icon={item.icon} active={activeGlobal === item.id} onClick={() => onNavGlobal(item.id)}/>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-slate-800">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">JL</div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-slate-300 truncate">Jamie Lee</div>
            <div className="text-[10px] text-slate-500 truncate">jamie@acme.dev</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function ProjectSidebar({ tab, setTab, onBack }: { tab: WorkspaceTab; setTab: (t: WorkspaceTab) => void; onBack: () => void }) {
  const items: { id: WorkspaceTab; label: string; icon: () => React.ReactElement }[] = [
    { id: 'overview', label: 'Overview', icon: I.grid },
    { id: 'repositories', label: 'Repositories', icon: I.folder },
    { id: 'logs', label: 'Logs', icon: I.log },
    { id: 'analysis', label: 'Analysis', icon: I.analysis },
    { id: 'report', label: 'Report', icon: I.report },
    { id: 'report-history', label: 'Reports History', icon: I.pulse },
    { id: 'source', label: 'Source Explorer', icon: I.code },
    { id: 'chunks', label: 'Chunk Explorer', icon: I.chunk },
    { id: 'embeddings', label: 'Embeddings', icon: I.embed },
    { id: 'git-diff', label: 'Git Diff', icon: I.git },
    { id: 'trace', label: 'Agent Trace', icon: I.stack },
    { id: 'team' as any, label: 'Team', icon: I.team },
    { id: 'settings-p' as any, label: 'Settings', icon: I.gear },
  ]
  return (
    <aside className="flex flex-col w-[220px] shrink-0 min-h-screen bg-slate-900">
      <div className="px-4 pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center shrink-0">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" stroke="white" strokeWidth="1.5"/><path d="M4 6l1.5 1.5L8.5 4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="text-white font-semibold text-[13px] tracking-tight">DebugMind</span>
        </div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors mb-2">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M7 2L3 5l4 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          All projects
        </button>
        <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-800 rounded-md">
          <I.folder/>
          <span className="text-slate-200 font-medium text-[12px]">payments-api</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-auto">
        {items.map(item => (
          <NavLink key={item.id} label={item.label} icon={item.icon}
            active={tab === item.id}
            onClick={() => {
              if (['team', 'settings-p'].includes(item.id)) return
              setTab(item.id)
            }}/>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-slate-800">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">JL</div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-slate-300 truncate">Jamie Lee</div>
            <div className="text-[10px] text-slate-500 truncate">jamie@acme.dev</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function NavLink({ label, icon: Icon, active, onClick }: { label: string; icon: () => React.ReactElement; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium w-full text-left transition-colors
        ${active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
      <Icon/>{label}
    </button>
  )
}

function Topbar({ breadcrumb }: { breadcrumb: React.ReactNode }) {
  return (
    <div className="h-12 flex items-center px-5 border-b border-slate-200 bg-white gap-4 shrink-0">
      <div className="flex items-center gap-1.5 text-[13px] text-slate-500 flex-1 min-w-0">{breadcrumb}</div>
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 w-48 shrink-0">
        <I.search/><input placeholder="Search..." className="bg-transparent outline-none text-[12px] text-slate-500 w-full placeholder:text-slate-400"/>
      </div>
      <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 relative transition-colors shrink-0">
        <I.bell/>
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-600"/>
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Screen 1 — Login
// ═══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[340px]">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="white" strokeWidth="1.5"/><path d="M4.5 6.5l2 2 3-3.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="font-semibold text-slate-900 text-[14px]">DebugMind</span>
        </div>
        <h1 className="text-[20px] font-semibold text-slate-900 mb-1">Sign in</h1>
        <p className="text-[13px] text-slate-500 mb-7">AI reliability engineer for CI failures and code debugging</p>
        <div className="flex flex-col gap-3 mb-5">
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" defaultValue="jamie@acme.dev"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"/>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1.5">Password</label>
            <input type="password" defaultValue="••••••••"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"/>
          </div>
          <Btn variant="primary" size="md" className="w-full justify-center" onClick={() => go('projects')}>Sign in</Btn>
        </div>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-slate-200"/><span className="text-[11px] text-slate-400">or</span><div className="flex-1 h-px bg-slate-200"/>
        </div>
        <button onClick={() => go('projects')}
          className="w-full flex items-center justify-center gap-2 border border-slate-300 bg-white rounded-md py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
          <I.gh/>Continue with GitHub
        </button>
        <p className="text-center text-[12px] text-slate-400 mt-5">
          No account? <span className="text-blue-600 cursor-pointer hover:underline">Request access</span>
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Screen 2 — Projects Dashboard
// ═══════════════════════════════════════════════════════════════════════════════
const projects = [
  { name: 'payments-api', owner: 'Backend Team', repos: 4, files: 1248, chunks: 8943, embeds: 8943, reports: 41, runs: 'Completed', failures: 12, updated: '2 hours ago', status: 'failed' },
  { name: 'inventory-service', owner: 'Platform Team', repos: 2, files: 621, chunks: 4102, embeds: 4102, reports: 18, runs: 'Completed', failures: 3, updated: '5 hours ago', status: 'success' },
  { name: 'auth-service', owner: 'Security Team', repos: 3, files: 942, chunks: 6831, embeds: 6831, reports: 29, runs: 'Running', failures: 7, updated: '12 min ago', status: 'running' },
  { name: 'notification-engine', owner: 'Infrastructure Team', repos: 1, files: 284, chunks: 1943, embeds: 1943, reports: 9, runs: 'No runs', failures: 0, updated: '3 days ago', status: 'pending' },
]
const sbv = (s: string): [string, BV] => {
  if (s === 'failed') return ['Failed', 'red']
  if (s === 'success') return ['Passed', 'green']
  if (s === 'running') return ['Running', 'blue']
  return ['No runs', 'default']
}

function ProjectsScreen({ go }: { go: (s: Screen) => void }) {
  const [filter, setFilter] = useState('All')
  const filters = ['All', 'Active', 'Archived', 'Recently Updated']
  const filtered = filter === 'All' ? projects :
    filter === 'Recently Updated' ? [...projects].sort((a, b) => a.updated.localeCompare(b.updated)) :
    projects

  return (
    <div className="flex min-h-screen bg-slate-50">
      <GlobalSidebar onProject={() => go('workspace')} onNavGlobal={() => {}} activeGlobal="projects"/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar breadcrumb={<span className="text-slate-900 font-medium">Projects</span>}/>
        <main className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-[16px] font-semibold text-slate-900">Projects</h1>
              <p className="text-[12px] text-slate-500 mt-0.5">{projects.length} projects · acme workspace</p>
            </div>
            <Btn variant="primary" icon={<I.plus/>} onClick={() => go('workspace')}>New Project</Btn>
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 mb-5">
            {filters.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-colors
                  ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}>
                {f}
              </button>
            ))}
          </div>

          {/* Project cards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filtered.map((p, i) => {
              const [label, variant] = sbv(p.status)
              return (
                <Card key={i} className="p-0 overflow-hidden" onClick={() => go('workspace')}>
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0"><I.folder/></div>
                      <div>
                        <div className="text-[13px] font-semibold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-500">{p.owner}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge label={label} variant={variant} dot/>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 divide-x divide-slate-100">
                    {[
                      ['Repos', p.repos],
                      ['Indexed files', p.files.toLocaleString()],
                      ['Chunks', p.chunks.toLocaleString()],
                      ['Embeddings', p.embeds.toLocaleString()],
                    ].map(([k, v]) => (
                      <div key={k as string} className="px-3.5 py-2.5">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{k}</div>
                        <div className="text-[14px] font-semibold text-slate-900 font-mono">{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
                    {[
                      ['Reports', p.reports],
                      ['Latest run', p.runs],
                      ['CI failures', p.failures],
                      ['Updated', p.updated],
                    ].map(([k, v]) => (
                      <div key={k as string} className="px-3.5 py-2.5">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{k}</div>
                        <div className={`text-[12px] font-medium ${k === 'CI failures' && Number(v) > 0 ? 'text-red-600' : 'text-slate-700'}`}>{v}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}
            {/* New project empty card */}
            <div className="border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-2 p-10 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors" onClick={() => go('workspace')}>
              <div className="text-slate-400 text-[13px]">Create a new project</div>
              <Btn variant="secondary" icon={<I.plus/>} size="xs">New Project</Btn>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Workspace Tabs
// ═══════════════════════════════════════════════════════════════════════════════

// ── Overview ──────────────────────────────────────────────────────────────────
const runChart = [
  { d: 'Jul 28', r: 3 }, { d: 'Jul 29', r: 5 }, { d: 'Jul 30', r: 2 },
  { d: 'Jul 31', r: 7 }, { d: 'Aug 1', r: 4 }, { d: 'Aug 2', r: 8 }, { d: 'Aug 3', r: 6 },
]

function OverviewTab({ setTab }: { setTab: (t: WorkspaceTab) => void }) {
  const metrics = [
    { label: 'Repositories', value: '4' }, { label: 'Files Indexed', value: '1,248' },
    { label: 'Chunks', value: '8,943' }, { label: 'Embeddings', value: '8,943' },
    { label: 'Logs', value: '14' }, { label: 'Reports', value: '41' },
    { label: 'Latest Analysis', value: 'Failed', highlight: true }, { label: 'Avg Confidence', value: '87%' },
  ]
  const health = [
    { name: 'Embedding DB', status: 'Healthy', ok: true },
    { name: 'Retriever', status: 'Healthy', ok: true },
    { name: 'Vector Store', status: 'Healthy', ok: true },
    { name: 'LLM', status: 'Healthy', ok: true },
    { name: 'Worker Queue', status: 'Running', ok: true },
  ]
  const feed = [
    { icon: '📁', msg: 'backend-api repository indexed · 3,124 chunks', time: '2 min ago' },
    { icon: '🧠', msg: 'Analysis run completed · report #41 generated', time: '12 min ago' },
    { icon: '📋', msg: 'CI failure uploaded · run #4891', time: '18 min ago' },
    { icon: '📝', msg: 'Report #40 generated · 91% confidence', time: '3 hr ago' },
    { icon: '✂️', msg: 'frontend chunking completed · 5,012 chunks', time: '5 hr ago' },
    { icon: '⚡', msg: 'Embedding build finished · 8,943 vectors', time: '6 hr ago' },
  ]
  return (
    <div className="flex flex-col gap-4">
      {/* Error banner */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg">
        <I.warn/><div className="flex-1 text-[12px]"><span className="font-medium text-red-800">Last agent run failed</span><span className="text-red-600 ml-2">test_login_success · 12 min ago</span></div>
        <Btn variant="secondary" size="xs" onClick={() => setTab('report')}>View report</Btn>
      </div>
      {/* Metrics */}
      <div className="grid grid-cols-4 xl:grid-cols-8 gap-2">
        {metrics.map(m => (
          <Card key={m.label} className="px-3 py-2.5">
            <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">{m.label}</div>
            <div className={`text-[17px] font-semibold ${m.highlight ? 'text-red-600' : 'text-slate-900'}`}>{m.value}</div>
          </Card>
        ))}
      </div>
      {/* Chart + feed + health */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-5">
          <Card className="p-4">
            <div className="text-[12px] font-semibold text-slate-700 mb-3">Agent runs — last 7 days</div>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={runChart}>
                <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3"/>
                <XAxis dataKey="d" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={18}/>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11 }} labelStyle={{ color: '#475569' }} itemStyle={{ color: '#2563eb' }}/>
                <Area type="monotone" dataKey="r" stroke="#2563eb" fill="url(#bg)" strokeWidth={1.5}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <div className="col-span-4">
          <Card className="p-4 h-full">
            <div className="text-[12px] font-semibold text-slate-700 mb-3">Recent activity</div>
            <div className="flex flex-col divide-y divide-slate-100">
              {feed.map((f, i) => (
                <div key={i} className="flex items-start gap-2 py-2">
                  <span className="text-sm shrink-0 mt-0.5">{f.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-600 leading-relaxed">{f.msg}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{f.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="col-span-3">
          <Card className="p-4 h-full">
            <div className="text-[12px] font-semibold text-slate-700 mb-3">System health</div>
            <div className="flex flex-col gap-2">
              {health.map(h => (
                <div key={h.name} className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-600">{h.name}</span>
                  <Badge label={h.status} variant={h.ok ? 'green' : 'red'} dot/>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Repository Management ─────────────────────────────────────────────────────
const repos = [
  { name: 'backend-api', branch: 'main', commit: '2d34fa', files: 421, chunks: 3124, embeds: 3124, status: 'Indexed', synced: '2 min ago' },
  { name: 'frontend', branch: 'main', commit: '94bb8f', files: 602, chunks: 5012, embeds: 5012, status: 'Indexed', synced: '5 min ago' },
  { name: 'shared-lib', branch: 'dev', commit: 'cc813d', files: 121, chunks: 823, embeds: 823, status: 'Chunked', synced: '1 hr ago' },
  { name: 'infra', branch: 'main', commit: '82ba91', files: 51, chunks: 0, embeds: 0, status: 'Registered', synced: '—' },
]
const repoStatusV = (s: string): BV => s === 'Indexed' ? 'green' : s === 'Chunked' ? 'blue' : s === 'Ingested' ? 'purple' : 'default'

function RepositoriesTab() {
  const [sel, setSel] = useState<number | null>(null)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Btn variant="secondary" size="xs" icon={<I.plus/>}>Register Repository</Btn>
        <Btn variant="secondary" size="xs" icon={<I.play/>}>Sync Repository</Btn>
        <Btn variant="secondary" size="xs" icon={<I.play/>}>Run Ingestion</Btn>
        <Btn variant="secondary" size="xs" icon={<I.play/>}>Chunk Repository</Btn>
        <Btn variant="primary" size="xs" icon={<I.play/>}>Build Embeddings</Btn>
        <div className="ml-auto"><Btn variant="ghost" size="xs" className="text-red-600 hover:bg-red-50">Delete Repository</Btn></div>
      </div>
      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Repository', 'Branch', 'Commit', 'Files', 'Chunks', 'Embeddings', 'Status', 'Last Sync'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {repos.map((r, i) => (
              <tr key={i} onClick={() => setSel(sel === i ? null : i)}
                className={`border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${sel === i ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                <td className="px-4 py-2.5"><span className="text-[12px] font-medium text-slate-900">{r.name}</span></td>
                <td className="px-4 py-2.5 text-[12px] font-mono text-slate-600">{r.branch}</td>
                <td className="px-4 py-2.5 text-[12px] font-mono text-slate-500">{r.commit}</td>
                <td className="px-4 py-2.5 text-[12px] text-slate-600">{r.files}</td>
                <td className="px-4 py-2.5 text-[12px] font-mono text-slate-600">{r.chunks || '—'}</td>
                <td className="px-4 py-2.5 text-[12px] font-mono text-slate-600">{r.embeds || '—'}</td>
                <td className="px-4 py-2.5"><Badge label={r.status} variant={repoStatusV(r.status)}/></td>
                <td className="px-4 py-2.5 text-[11px] text-slate-500">{r.synced}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── Logs ──────────────────────────────────────────────────────────────────────
const rawLog = `============================= test session starts ==============================
platform linux -- Python 3.11.4, pytest-7.4.0
rootdir: /app, configfile: pytest.ini
collected 48 items

tests/test_auth.py::test_signup_success PASSED                           [  2%]
tests/test_auth.py::test_login_success FAILED                            [  4%]
tests/test_auth.py::test_token_refresh PASSED                            [  6%]

================================== FAILURES ===================================
__________________ test_login_success __________________

    def test_login_success(client, auth_headers):
        response = client.post("/auth/login", headers=auth_headers,
                               json={"email": "user@test.com", "password": "secret"})
>       assert response.status_code == 200
E       AssertionError: assert 401 == 200
E        +  where 401 = <Response [401]>.status_code

tests/test_auth.py:20: AssertionError
----------------------------- Captured log call --------------------------------
ERROR    app.auth.middleware:middleware.py:48 tenant_id required
========================= 1 failed, 47 passed in 3.21s =========================`

const logLines = rawLog.split('\n')
const errLines = new Set([6, 17, 18, 19, 21, 25])

function LogsTab() {
  const [activeSource, setActiveSource] = useState('Upload')
  const sources = ['Upload', 'Paste', 'GitHub Action', 'Jenkins', 'CircleCI', 'GitLab', 'Azure DevOps']
  const tabs = ['Upload', 'Paste', 'Recent']
  const [activeTab, setActiveTab] = useState('Upload')
  const [parsed, setParsed] = useState(true)

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-11rem)] overflow-hidden">
      {/* Source selector + tabs */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {sources.map(s => (
            <button key={s} onClick={() => setActiveSource(s)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors
                ${activeSource === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 border-b border-slate-200">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 text-[12px] font-medium border-b-2 transition-colors -mb-px
                ${activeTab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Upload' && (
        <div className="flex-none">
          <div className="border-2 border-dashed border-slate-200 rounded-lg px-4 py-5 flex items-center gap-3 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
            <I.upload/><span className="text-[12px] text-slate-500">Drop CI log here, or <span className="text-blue-600 font-medium">browse</span></span>
            <div className="ml-auto"><Btn variant="primary" size="xs" icon={<I.play/>} onClick={() => setParsed(true)}>Parse Log</Btn></div>
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-5 gap-3 overflow-hidden min-h-0">
        {/* Log viewer */}
        <div className="col-span-3 flex flex-col gap-2 overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <span className="text-[12px] font-semibold text-slate-700">Raw log · pytest</span>
            <div className="flex items-center gap-2"><Badge label="1 failed" variant="red" dot/><Badge label="47 passed" variant="green" dot/></div>
          </div>
          <Card className="flex-1 overflow-auto">
            <pre className="p-3 text-[11px] font-mono leading-relaxed">
              {logLines.map((line, i) => (
                <div key={i} className={`flex gap-3 px-1.5 -mx-1 rounded ${errLines.has(i) ? 'bg-red-50 text-red-700' : 'text-slate-600'}`}>
                  <span className="select-none text-slate-300 text-[10px] w-5 text-right shrink-0">{i+1}</span>
                  <span>{line || ' '}</span>
                </div>
              ))}
            </pre>
          </Card>
        </div>

        {/* Parsed failures */}
        <div className="col-span-2 flex flex-col gap-3 overflow-auto">
          <span className="text-[12px] font-semibold text-slate-700 shrink-0">Parsed failures</span>
          {parsed && (<>
            <Card className="p-3.5">
              <div className="flex items-start justify-between mb-2.5">
                <div>
                  <div className="text-[12px] font-semibold text-slate-900 font-mono">test_login_success</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">tests/test_auth.py · line 20</div>
                </div>
                <Badge label="AssertionError" variant="red"/>
              </div>
              {[
                ['Failed step', 'test_login_success'],
                ['Failed test', 'test_auth.py::test_login_success'],
                ['Exit code', '1'],
                ['Duration', '3.21s'],
                ['Framework', 'pytest 7.4.0'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-slate-100 last:border-0 text-[11px]">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-800 font-mono">{v}</span>
                </div>
              ))}
              <div className="mt-2.5 bg-red-50 border border-red-200 rounded-md p-2">
                <code className="text-[11px] font-mono text-red-700 leading-relaxed">
                  {'AssertionError: assert 401 == 200\n  +  where 401 = <Response [401]>.status_code'}
                </code>
              </div>
              <div className="mt-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Referenced files</div>
              {['tests/test_auth.py:20', 'app/auth/middleware.py:48'].map(f => (
                <div key={f} className="flex items-center gap-1 text-[11px] font-mono text-blue-600 hover:underline cursor-pointer py-0.5">
                  <I.ext/>{f}
                </div>
              ))}
            </Card>
            <Card className="p-3.5 border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2 mb-1.5"><I.warn/><span className="text-[11px] font-semibold text-amber-800">Captured log</span></div>
              <code className="text-[11px] font-mono text-amber-700">ERROR app.auth.middleware:middleware.py:48 tenant_id required</code>
            </Card>
          </>)}
        </div>
      </div>
    </div>
  )
}

// ── Source Explorer ───────────────────────────────────────────────────────────
const fileTree = [
  { name: 'app', type: 'dir', open: true, children: [
    { name: 'auth', type: 'dir', open: true, children: [
      { name: 'middleware.py', type: 'file', active: true },
      { name: 'handlers.py', type: 'file' },
    ]},
    { name: 'models', type: 'dir', open: false, children: [{ name: 'user.py', type: 'file' }] },
    { name: 'config', type: 'dir', open: false, children: [{ name: 'settings.py', type: 'file' }] },
  ]},
  { name: 'tests', type: 'dir', open: true, children: [
    { name: 'test_auth.py', type: 'file' },
    { name: 'conftest.py', type: 'file' },
  ]},
  { name: 'utils', type: 'dir', open: false, children: [] },
  { name: 'README.md', type: 'file' },
]

const sourceCode = `# app/auth/middleware.py
from functools import wraps
from flask import request, jsonify
from app.services.token import decode_jwt

class AuthenticationError(Exception):
    pass

def authenticate_request(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").removeprefix("Bearer ")
        if not token:
            return jsonify({"error": "Missing token"}), 401

        try:
            payload = decode_jwt(token)
        except Exception:
            return jsonify({"error": "Invalid token"}), 401

        tenant_id = payload.get("tenant_id")      # line 20

        if not tenant_id:                          # line 22
            raise AuthenticationError(             # line 23
                "tenant_id required"               # line 24
            )

        request.user = payload
        return f(*args, **kwargs)
    return decorated`

function TreeNode({ node, depth = 0 }: { node: any; depth?: number }) {
  const [open, setOpen] = useState(node.open ?? depth < 1)
  if (node.type === 'dir') {
    return (<div>
      <div onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-0.5 hover:bg-slate-100 rounded cursor-pointer text-[12px] text-slate-500"
        style={{ paddingLeft: `${8 + depth * 12}px` }}>
        <span className="text-[9px]">{open ? '▾' : '▸'}</span>
        <I.folder/><span>{node.name}</span>
      </div>
      {open && node.children?.map((c: any, i: number) => <TreeNode key={i} node={c} depth={depth+1}/>)}
    </div>)
  }
  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer text-[12px] ${node.active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
      style={{ paddingLeft: `${8 + depth * 12}px` }}>
      <I.code/><span>{node.name}</span>
    </div>
  )
}

function SourceExplorerTab() {
  return (
    <div className="flex gap-3 h-[calc(100vh-11rem)] overflow-hidden">
      {/* File tree */}
      <div className="w-44 shrink-0 flex flex-col gap-2 overflow-hidden">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">backend-api</div>
        <Card className="flex-1 overflow-auto py-2">
          {fileTree.map((n, i) => <TreeNode key={i} node={n}/>)}
        </Card>
      </div>

      {/* Code panel */}
      <div className="flex-1 flex flex-col gap-2 overflow-hidden min-w-0">
        {/* File meta bar */}
        <Card className="px-4 py-2 flex items-center gap-4 shrink-0">
          {[
            ['File', 'middleware.py'], ['Language', 'Python'], ['Lines', '142'],
            ['Tokens', '1,284'], ['Chunks', '8'], ['Indexed', '✓'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">{k}</span>
              <span className="text-[11px] font-medium text-slate-700 font-mono">{v}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <button className="p-1 rounded hover:bg-slate-100 text-slate-400"><I.copy/></button>
            <button className="p-1 rounded hover:bg-slate-100 text-slate-400"><I.ext/></button>
          </div>
        </Card>

        {/* Code */}
        <Card className="flex-1 overflow-auto">
          <pre className="p-4 text-[11.5px] font-mono leading-relaxed">
            {sourceCode.split('\n').map((line, i) => (
              <div key={i} className={`flex gap-4 px-1 -mx-1 rounded ${[21,22,23,24].includes(i) ? 'bg-amber-50 border-l-2 border-amber-400' : ''}`}>
                <span className="text-slate-300 text-[10px] w-5 text-right select-none shrink-0">{i+1}</span>
                <span className="text-slate-700">{line}</span>
              </div>
            ))}
          </pre>
        </Card>

        {/* Chunk mapping bar */}
        <Card className="px-4 py-2.5 shrink-0">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Chunk mapping</div>
          <div className="flex gap-0.5 h-4">
            {[18,22,15,19,24,17,21,14].map((w, i) => (
              <div key={i} title={`CHK-00${41+i}`}
                className="rounded-sm cursor-pointer hover:opacity-80 transition-opacity"
                style={{ flex: w, background: ['#bfdbfe','#c7d2fe','#ddd6fe','#bbf7d0','#bfdbfe','#fde68a','#c7d2fe','#bbf7d0'][i] }}/>
            ))}
          </div>
        </Card>
      </div>

      {/* Metadata panel */}
      <div className="w-48 shrink-0 flex flex-col gap-3 overflow-auto">
        <Card className="p-3.5">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Metadata</div>
          {[
            ['Chunk count', '8'], ['Embedding count', '8'], ['Functions', '3'],
            ['Classes', '1'], ['Imports', '4'], ['References', '12'],
            ['Outgoing links', '3'], ['Incoming links', '6'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1 border-b border-slate-100 last:border-0 text-[11px]">
              <span className="text-slate-500">{k}</span>
              <span className="text-slate-800 font-mono">{v}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ── Chunk Explorer ────────────────────────────────────────────────────────────
const chunks = [
  { id: 'CHK-0041', repo: 'backend-api', file: 'app/auth/middleware.py', start: 1, end: 18, tokens: 284, embed: 'Yes', refs: 3 },
  { id: 'CHK-0042', repo: 'backend-api', file: 'app/auth/middleware.py', start: 19, end: 31, tokens: 196, embed: 'Yes', refs: 5 },
  { id: 'CHK-0088', repo: 'backend-api', file: 'tests/test_auth.py', start: 12, end: 28, tokens: 312, embed: 'Yes', refs: 2 },
  { id: 'CHK-0089', repo: 'backend-api', file: 'tests/test_auth.py', start: 29, end: 56, tokens: 341, embed: 'Yes', refs: 1 },
  { id: 'CHK-0019', repo: 'backend-api', file: 'tests/conftest.py', start: 8, end: 20, tokens: 127, embed: 'Yes', refs: 4 },
  { id: 'CHK-0022', repo: 'shared-lib', file: 'utils/jwt.py', start: 1, end: 35, tokens: 258, embed: 'Pending', refs: 0 },
]

function ChunksTab() {
  const [sel, setSel] = useState<number | null>(0)

  return (
    <div className="flex gap-4 h-[calc(100vh-11rem)] overflow-hidden">
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center gap-2 shrink-0">
          <select className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-[12px] text-slate-600 outline-none">
            <option>All repositories</option>
            {repos.map(r => <option key={r.name}>{r.name}</option>)}
          </select>
          <select className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-[12px] text-slate-600 outline-none">
            <option>All files</option>
          </select>
          <span className="ml-auto text-[11px] text-slate-500">{chunks.length} chunks</span>
        </div>
        <Card className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white border-b border-slate-100">
              <tr>
                {['Chunk ID', 'Repository', 'File', 'Start', 'End', 'Tokens', 'Embedding', 'Referenced'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chunks.map((c, i) => (
                <tr key={i} onClick={() => setSel(sel === i ? null : i)}
                  className={`border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${sel === i ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-2.5 text-[12px] font-mono font-medium text-blue-600">{c.id}</td>
                  <td className="px-4 py-2.5 text-[12px] text-slate-600">{c.repo}</td>
                  <td className="px-4 py-2.5 text-[12px] font-mono text-slate-700">{c.file}</td>
                  <td className="px-4 py-2.5 text-[12px] font-mono text-slate-500">{c.start}</td>
                  <td className="px-4 py-2.5 text-[12px] font-mono text-slate-500">{c.end}</td>
                  <td className="px-4 py-2.5 text-[12px] font-mono text-slate-600">{c.tokens}</td>
                  <td className="px-4 py-2.5"><Badge label={c.embed} variant={c.embed === 'Yes' ? 'green' : 'amber'}/></td>
                  <td className="px-4 py-2.5 text-[12px] text-slate-600">{c.refs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {sel !== null && (
        <div className="w-72 shrink-0 flex flex-col gap-3 overflow-auto">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold text-slate-900 font-mono">{chunks[sel].id}</span>
              <button onClick={() => setSel(null)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            {[
              ['Repository', chunks[sel].repo], ['File', chunks[sel].file],
              ['Lines', `${chunks[sel].start}–${chunks[sel].end}`],
              ['Tokens', chunks[sel].tokens.toString()],
              ['Embedding', chunks[sel].embed],
              ['References', chunks[sel].refs.toString()],
              ['Hash', 'sha256:a3f9b1c…'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0 text-[11px]">
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-800 font-mono truncate ml-2 max-w-[140px] text-right">{v}</span>
              </div>
            ))}
          </Card>
          <Card className="p-3.5">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Chunk preview</div>
            <pre className="text-[10px] font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded p-2.5 overflow-auto leading-relaxed">
{`tenant_id = payload.get("tenant_id")
if not tenant_id:
    raise AuthenticationError(
        "tenant_id required"
    )
request.user = payload`}
            </pre>
          </Card>
          <Card className="p-3.5">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Referenced reports</div>
            {['RPT-041', 'RPT-039'].map(r => (
              <div key={r} className="text-[11px] font-mono text-blue-600 hover:underline cursor-pointer py-0.5">{r}</div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}

// ── Embeddings ────────────────────────────────────────────────────────────────
const embedData = [
  { d: 'Aug 1', v: 3200 }, { d: 'Aug 2', v: 5100 }, { d: 'Aug 3', v: 8943 },
]
const embedRows = [
  { chunk: 'CHK-0041', vectorId: 'vec_a3f9b1c', created: 'Aug 3, 09:14', status: 'Active', sim: '0.94', retrieved: '2 min ago' },
  { chunk: 'CHK-0042', vectorId: 'vec_d8e2ca1', created: 'Aug 3, 09:14', status: 'Active', sim: '0.87', retrieved: '12 min ago' },
  { chunk: 'CHK-0088', vectorId: 'vec_f1b9e33', created: 'Aug 3, 09:16', status: 'Active', sim: '0.91', retrieved: '12 min ago' },
  { chunk: 'CHK-0019', vectorId: 'vec_c7a2d44', created: 'Aug 3, 09:18', status: 'Active', sim: '0.76', retrieved: '12 min ago' },
  { chunk: 'CHK-0022', vectorId: '—', created: '—', status: 'Pending', sim: '—', retrieved: '—' },
]

function EmbeddingsTab() {
  const pct = 94
  return (
    <div className="flex flex-col gap-4">
      {/* Metrics */}
      <div className="grid grid-cols-6 gap-3">
        {[
          ['Total embeddings', '8,943'], ['Dimension', '1,536'], ['Provider', 'OpenAI'],
          ['Storage', '24.1 MB'], ['Avg chunk size', '284 tok'], ['Version', 'text-embedding-3-small'],
        ].map(([k, v]) => (
          <Card key={k} className="px-3 py-2.5">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{k}</div>
            <div className="text-[14px] font-semibold text-slate-900 font-mono">{v}</div>
          </Card>
        ))}
      </div>

      {/* Coverage + chart */}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1">
          <Card className="p-4 h-full">
            <div className="text-[12px] font-semibold text-slate-700 mb-3">Coverage</div>
            <div className="flex items-center justify-between text-[12px] mb-2">
              <span className="text-slate-600">Indexed</span>
              <span className="font-mono font-semibold text-green-700">{pct}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }}/>
            </div>
            <div className="text-[11px] text-slate-500">8,943 of 9,512 chunks embedded</div>
            <div className="mt-3 text-[11px] text-amber-600">569 pending</div>
          </Card>
        </div>
        <div className="col-span-3">
          <Card className="p-4">
            <div className="text-[12px] font-semibold text-slate-700 mb-3">Embedding progress</div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={embedData}>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="d" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={40}/>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11 }} labelStyle={{ color: '#475569' }} itemStyle={{ color: '#2563eb' }}/>
                <Bar dataKey="v" fill="#2563eb" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>

      {/* Table */}
      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Chunk', 'Vector ID', 'Created', 'Status', 'Similarity', 'Last Retrieved'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {embedRows.map((r, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 text-[12px] font-mono font-medium text-blue-600">{r.chunk}</td>
                <td className="px-4 py-2.5 text-[12px] font-mono text-slate-600">{r.vectorId}</td>
                <td className="px-4 py-2.5 text-[12px] text-slate-600">{r.created}</td>
                <td className="px-4 py-2.5"><Badge label={r.status} variant={r.status === 'Active' ? 'green' : 'amber'}/></td>
                <td className="px-4 py-2.5 text-[12px] font-mono text-slate-700">{r.sim}</td>
                <td className="px-4 py-2.5 text-[12px] text-slate-500">{r.retrieved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── Git Diff ──────────────────────────────────────────────────────────────────
const oldCode = [
  { n: 8, line: '@pytest.fixture', type: 'ctx' },
  { n: 9, line: 'def auth_headers():', type: 'ctx' },
  { n: 10, line: '    """Create auth headers for tests."""', type: 'ctx' },
  { n: 11, line: '    token = create_jwt({', type: 'ctx' },
  { n: 12, line: '        "sub": "user_123",', type: 'ctx' },
  { n: 13, line: '        "email": "user@test.com"', type: 'rem' },
  { n: 14, line: '    })', type: 'ctx' },
  { n: 15, line: '    return {"Authorization": f"Bearer {token}"}', type: 'ctx' },
]
const newCode = [
  { n: 8, line: '@pytest.fixture', type: 'ctx' },
  { n: 9, line: 'def auth_headers():', type: 'ctx' },
  { n: 10, line: '    """Create auth headers for tests."""', type: 'ctx' },
  { n: 11, line: '    token = create_jwt({', type: 'ctx' },
  { n: 12, line: '        "sub": "user_123",', type: 'ctx' },
  { n: 13, line: '        "email": "user@test.com",', type: 'ctx' },
  { n: 14, line: '        "tenant_id": "test-tenant"', type: 'add' },
  { n: 15, line: '    })', type: 'ctx' },
  { n: 16, line: '    return {"Authorization": f"Bearer {token}"}', type: 'ctx' },
]

function GitDiffTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <select className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-[12px] text-slate-700 outline-none">
          <option>backend-api</option>
          {repos.map(r => <option key={r.name}>{r.name}</option>)}
        </select>
        <select className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-[12px] text-slate-700 outline-none">
          <option>a3f9b1c → 2d34fa</option>
        </select>
        <span className="text-[12px] text-slate-500 ml-2">tests/conftest.py</span>
        <div className="ml-auto flex items-center gap-2">
          <Badge label="+1 line" variant="green"/>
          <Badge label="-1 line" variant="red"/>
        </div>
      </div>

      {/* Split diff */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
          <span className="text-[11px] font-mono text-slate-500">tests/conftest.py</span>
          <Badge label="Modified" variant="amber"/>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-200">
          <div>
            <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-[11px] font-mono text-red-600">a3f9b1c · Before</div>
            <pre className="text-[11px] font-mono p-3 leading-relaxed">
              {oldCode.map((l, i) => (
                <div key={i} className={`flex gap-3 px-1 -mx-1 rounded ${l.type === 'rem' ? 'bg-red-50 text-red-700' : 'text-slate-600'}`}>
                  <span className="text-slate-300 w-5 text-right select-none shrink-0">{l.n}</span>
                  <span>{l.type === 'rem' ? '- ' : '  '}{l.line}</span>
                </div>
              ))}
            </pre>
          </div>
          <div>
            <div className="px-4 py-2 bg-green-50 border-b border-green-100 text-[11px] font-mono text-green-600">2d34fa · After</div>
            <pre className="text-[11px] font-mono p-3 leading-relaxed">
              {newCode.map((l, i) => (
                <div key={i} className={`flex gap-3 px-1 -mx-1 rounded ${l.type === 'add' ? 'bg-green-50 text-green-700' : 'text-slate-600'}`}>
                  <span className="text-slate-300 w-5 text-right select-none shrink-0">{l.n}</span>
                  <span>{l.type === 'add' ? '+ ' : '  '}{l.line}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </Card>

      {/* AI impacted chunks */}
      <div>
        <div className="text-[12px] font-semibold text-slate-700 mb-2">AI detected impacted chunks</div>
        <div className="flex flex-col gap-2">
          {[
            { chunk: 'CHK-0019', report: 'RPT-041', sim: '0.91', reason: 'auth_headers fixture directly produces the JWT payload missing tenant_id' },
            { chunk: 'CHK-0088', report: 'RPT-041', sim: '0.87', reason: 'test_login_success consumes auth_headers; this diff resolves the root cause' },
          ].map((c, i) => (
            <Card key={i} className="px-4 py-3 flex items-center gap-4">
              <span className="text-[12px] font-mono font-medium text-blue-600">{c.chunk}</span>
              <span className="text-[11px] text-slate-500">Referenced by <span className="text-blue-600 font-mono">{c.report}</span></span>
              <span className="text-[11px] font-mono text-green-700">Similarity {c.sim}</span>
              <p className="text-[11px] text-slate-600 flex-1">{c.reason}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Analysis ──────────────────────────────────────────────────────────────────
const pipelineSteps = [
  { key: 'classify', label: 'Classify Failure', status: 'completed', latency: '0.31s', detail: 'AssertionError · HTTP 401 · auth domain' },
  { key: 'plan', label: 'Plan Retrieval', status: 'completed', latency: '1.08s', detail: '3 search queries generated' },
  { key: 'search', label: 'Search Codebase', status: 'completed', latency: '2.41s', detail: '6 chunks retrieved across 3 files' },
  { key: 'rank', label: 'Rank Chunks', status: 'completed', latency: '0.44s', detail: 'Top 3 selected: CHK-0041, CHK-0088, CHK-0019' },
  { key: 'read', label: 'Read Context', status: 'completed', latency: '1.12s', detail: 'Full context loaded for top 3 chunks' },
  { key: 'analyze', label: 'Analyze', status: 'completed', latency: '4.17s', detail: 'tenant_id missing in auth_headers fixture' },
  { key: 'verify', label: 'Verify', status: 'completed', latency: '1.82s', detail: 'Confirmed via middleware.py:22–24' },
  { key: 'report', label: 'Generate Report', status: 'completed', latency: '3.09s', detail: 'Report #41 generated · 94% confidence' },
]
const evidenceChunks = [
  { id: 'CHK-0041', repo: 'backend-api', file: 'app/auth/middleware.py', lines: '19–31', sim: '0.94', conf: '97%', reason: 'Direct source of 401: tenant_id null check' },
  { id: 'CHK-0088', repo: 'backend-api', file: 'tests/test_auth.py', lines: '12–28', sim: '0.91', conf: '92%', reason: 'Failing test — uses auth_headers fixture missing tenant_id' },
  { id: 'CHK-0019', repo: 'backend-api', file: 'tests/conftest.py', lines: '8–20', sim: '0.76', conf: '88%', reason: 'auth_headers fixture creates JWT without tenant_id claim' },
]

function AnalysisTab({ setTab }: { setTab: (t: WorkspaceTab) => void }) {
  const [done] = useState(true)
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Debug query</div>
        <div className="flex gap-3">
          <input defaultValue="Why is this CI build failing?"
            className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"/>
          <Btn variant="primary" icon={<I.play/>}>Run DebugMind Agent</Btn>
        </div>
      </Card>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3">
          <Card>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-[12px] font-semibold text-slate-700">Agent pipeline</span>
              {done && <Badge label="Completed · 14.4s total" variant="green" dot/>}
            </div>
            <div className="divide-y divide-slate-100">
              {pipelineSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-5 h-5 rounded-full border-2 border-green-500 bg-green-50 flex items-center justify-center shrink-0"><I.check/></div>
                  <div className="flex-1">
                    <span className="text-[12px] font-medium text-slate-900">{step.label}</span>
                    <p className="text-[11px] text-slate-500">{step.detail}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge label="Completed" variant="green"/>
                    <span className="text-[11px] font-mono text-slate-400">{step.latency}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-slate-100">
              <Btn variant="primary" size="xs" onClick={() => setTab('report')}>View report →</Btn>
            </div>
          </Card>
        </div>

        <div className="col-span-2 flex flex-col gap-3">
          <Card className="p-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Search queries</div>
            {['test_login_success 401', 'tenant_id auth middleware', 'AssertionError assert 401 == 200'].map((q, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 mb-1.5 last:mb-0">
                <I.search/>
                <code className="text-[11px] font-mono text-slate-700">{q}</code>
              </div>
            ))}
          </Card>
          <Card className="p-4 flex-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Retrieved chunks</div>
            <div className="flex flex-col gap-2">
              {evidenceChunks.map((c, i) => (
                <div key={i} className="border border-slate-200 rounded-md p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono font-semibold text-blue-600">{c.id}</span>
                    <span className={`text-[11px] font-mono font-semibold ${parseFloat(c.sim) >= 0.9 ? 'text-green-600' : 'text-amber-600'}`}>{c.sim}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mb-1">{c.repo}/{c.file}:{c.lines}</div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{c.reason}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-slate-400">Confidence</span>
                    <Badge label={c.conf} variant="blue"/>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Debug Report ──────────────────────────────────────────────────────────────
const reportEvidence = [
  { id: 'CHK-0041', repo: 'backend-api', file: 'app/auth/middleware.py', lines: '19–31', sim: '0.94', conf: '97%',
    reason: 'authenticate_request() raises 401 when tenant_id is absent from the JWT payload. This is the proximate cause.',
    code: `tenant_id = payload.get("tenant_id")
if not tenant_id:
    raise AuthenticationError("tenant_id required")` },
  { id: 'CHK-0088', repo: 'backend-api', file: 'tests/test_auth.py', lines: '12–28', sim: '0.91', conf: '92%',
    reason: 'test_login_success uses auth_headers fixture and posts to /auth/login — receives 401 because fixture omits tenant_id.',
    code: `def test_login_success(client, auth_headers):
    response = client.post("/auth/login", ...)
    assert response.status_code == 200  # got 401` },
  { id: 'CHK-0019', repo: 'backend-api', file: 'tests/conftest.py', lines: '8–20', sim: '0.76', conf: '88%',
    reason: 'auth_headers fixture creates JWT without tenant_id claim — root fix location.',
    code: `@pytest.fixture
def auth_headers():
    token = create_jwt({"sub": "user_123"})  # ← missing tenant_id` },
]

function ReportTab() {
  const [exp, setExp] = useState<number | null>(0)
  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      {/* Header */}
      <Card className="p-4 border-l-4 border-l-red-500">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge label="RPT-041" variant="default"/>
              <Badge label="Authentication" variant="red"/>
              <Badge label="Verified" variant="green"/>
              <span className="text-[11px] text-slate-400">Generated 12 min ago · claude-opus-5</span>
            </div>
            <h2 className="text-[14px] font-semibold text-slate-900">test_login_success fails with HTTP 401 — tenant_id missing from test fixture</h2>
          </div>
          <div className="shrink-0 ml-6 text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Confidence</div>
            <div className="flex items-center gap-2">
              <div className="w-28 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '94%' }}/>
              </div>
              <span className="text-[14px] font-semibold text-green-700 font-mono">94%</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
              <span>Failure type: <strong className="text-slate-700">Authentication</strong></span>
            </div>
          </div>
        </div>
      </Card>

      {/* Root cause */}
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-2">Root cause</div>
        <p className="text-[13px] text-amber-900 leading-relaxed">
          The <code className="font-mono text-[12px] bg-amber-100 px-1 rounded">authenticate_request</code> middleware requires a <code className="font-mono text-[12px] bg-amber-100 px-1 rounded">tenant_id</code> claim in the JWT payload. The <code className="font-mono text-[12px] bg-amber-100 px-1 rounded">auth_headers</code> fixture in <code className="font-mono text-[12px] bg-amber-100 px-1 rounded">tests/conftest.py</code> constructs tokens without this claim, so every test using this fixture receives HTTP 401 instead of 200.
        </p>
      </Card>

      {/* Suggested fix */}
      <Card className="p-4">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Suggested fix</div>
        <div className="flex flex-col gap-2 mb-3">
          {['Update auth_headers fixture to inject tenant_id into the JWT payload.', 'Use a deterministic value such as "test-tenant" for all authentication tests.', 'Re-run the full test_auth.py suite to confirm all tests pass after the change.'].map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
              <span className="text-[12px] text-slate-700">{s}</span>
            </div>
          ))}
        </div>
        <pre className="bg-slate-900 text-slate-100 rounded-md p-3.5 text-[11px] font-mono leading-relaxed overflow-auto">
          <span className="text-slate-500"># tests/conftest.py</span>{'\n'}
          <span className="text-red-400">{'- token = create_jwt({"sub": "user_123"})'}</span>{'\n'}
          <span className="text-green-400">{'+ token = create_jwt({"sub": "user_123", "tenant_id": "test-tenant"})'}</span>
        </pre>
      </Card>

      {/* Missing info */}
      <Card className="p-4">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Missing information</div>
        <ul className="flex flex-col gap-1.5">
          {['Commit history for conftest.py — when did tenant_id become required?',
            'Whether other fixtures (admin_headers, service_headers) share the same gap.'].map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] text-slate-600">
              <span className="text-amber-500 shrink-0">◆</span>{s}
            </li>
          ))}
        </ul>
      </Card>

      {/* Evidence */}
      <div>
        <div className="text-[12px] font-semibold text-slate-700 mb-2">Evidence · {reportEvidence.length} sources</div>
        <div className="flex flex-col gap-2">
          {reportEvidence.map((e, i) => (
            <Card key={i}>
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExp(exp === i ? null : i)}>
                <span className="text-[12px] font-mono font-semibold text-blue-600">{e.id}</span>
                <span className="text-[12px] font-mono text-slate-700">{e.repo}/{e.file}</span>
                <span className="text-[11px] text-slate-400">:{e.lines}</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className={`text-[11px] font-mono font-semibold ${parseFloat(e.sim) >= 0.9 ? 'text-green-600' : 'text-amber-600'}`}>{e.sim}</span>
                  <Badge label={e.conf} variant="blue"/>
                  {exp === i ? <I.chevD/> : <I.chevR/>}
                </div>
              </div>
              {exp === i && (
                <div className="border-t border-slate-100 px-4 py-3 flex flex-col gap-3">
                  <p className="text-[12px] text-slate-600 leading-relaxed">{e.reason}</p>
                  <pre className="bg-slate-50 border border-slate-200 rounded-md p-3 text-[11px] font-mono text-slate-700 leading-relaxed overflow-auto">{e.code}</pre>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Reports History ───────────────────────────────────────────────────────────
const allReports = [
  { id: 'RPT-041', failure: 'test_login_success 401', repo: 'backend-api', status: 'Verified', confidence: 94, engineer: 'Jamie Lee', created: 'Aug 3, 09:14', version: 'v2.1' },
  { id: 'RPT-040', failure: 'test_payment_timeout', repo: 'backend-api', status: 'Verified', confidence: 88, engineer: 'Sam Chen', created: 'Aug 2, 15:22', version: 'v2.1' },
  { id: 'RPT-039', failure: 'test_webhook_signature', repo: 'backend-api', status: 'Pending', confidence: 71, engineer: 'Jamie Lee', created: 'Aug 1, 11:04', version: 'v2.0' },
  { id: 'RPT-038', failure: 'test_signup_duplicate', repo: 'frontend', status: 'Verified', confidence: 91, engineer: 'Alex Kim', created: 'Jul 31, 09:30', version: 'v2.0' },
  { id: 'RPT-037', failure: 'test_token_refresh_expiry', repo: 'shared-lib', status: 'Pending', confidence: 64, engineer: 'Jamie Lee', created: 'Jul 30, 16:11', version: 'v1.9' },
]

function ReportHistoryTab({ setTab }: { setTab: (t: WorkspaceTab) => void }) {
  const [filter, setFilter] = useState('All')
  const filters = ['All', 'Verified', 'Pending', 'High Confidence', 'Recent']
  const filtered = filter === 'High Confidence' ? allReports.filter(r => r.confidence >= 85) : allReports

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-colors
              ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}>
            {f}
          </button>
        ))}
        <select className="ml-auto bg-white border border-slate-300 rounded-md px-2.5 py-1 text-[12px] text-slate-600 outline-none">
          <option>All repositories</option>
          {repos.map(r => <option key={r.name}>{r.name}</option>)}
        </select>
      </div>

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Analysis ID', 'Failure', 'Repository', 'Status', 'Confidence', 'Engineer', 'Created', 'Version'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} onClick={() => setTab('report')}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors">
                <td className="px-4 py-2.5 text-[12px] font-mono font-medium text-blue-600">{r.id}</td>
                <td className="px-4 py-2.5 text-[12px] font-mono text-slate-700">{r.failure}</td>
                <td className="px-4 py-2.5 text-[12px] text-slate-600">{r.repo}</td>
                <td className="px-4 py-2.5"><Badge label={r.status} variant={r.status === 'Verified' ? 'green' : 'amber'}/></td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${r.confidence}%`, background: r.confidence >= 85 ? '#16a34a' : r.confidence >= 70 ? '#d97706' : '#dc2626' }}/>
                    </div>
                    <span className={`text-[11px] font-mono font-semibold ${r.confidence >= 85 ? 'text-green-700' : r.confidence >= 70 ? 'text-amber-700' : 'text-red-700'}`}>{r.confidence}%</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-[12px] text-slate-600">{r.engineer}</td>
                <td className="px-4 py-2.5 text-[12px] text-slate-500">{r.created}</td>
                <td className="px-4 py-2.5"><Badge label={r.version} variant="default"/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── Agent Trace ───────────────────────────────────────────────────────────────
const traceSteps = [
  { agent: 'Planner', step: 'classify_failure', status: 'completed', latency: '0.31s', tokens: 842, cost: '$0.0012', promptVer: 'v2.1', retries: 0, started: '09:14:31', finished: '09:14:32',
    input: { log_snippet: 'AssertionError: assert 401 == 200', file: 'tests/test_auth.py:20' },
    output: { failure_type: 'AssertionError', domain: 'auth', http_status: 401, confidence: 0.97 } },
  { agent: 'Retriever', step: 'plan_and_search', status: 'completed', latency: '3.49s', tokens: 2114, cost: '$0.0031', promptVer: 'v2.1', retries: 0, started: '09:14:32', finished: '09:14:35',
    input: { failure_type: 'AssertionError', domain: 'auth' },
    output: { queries: 3, chunks_retrieved: 6, top_score: 0.94 } },
  { agent: 'Ranker', step: 'rank_chunks', status: 'completed', latency: '0.44s', tokens: 614, cost: '$0.0009', promptVer: 'v1.8', retries: 0, started: '09:14:35', finished: '09:14:36',
    input: { chunks_in: 6 },
    output: { chunks_out: 3, reranker: 'cross-encoder/ms-marco-MiniLM' } },
  { agent: 'Analyzer', step: 'analyze_root_cause', status: 'completed', latency: '4.17s', tokens: 5821, cost: '$0.0087', promptVer: 'v2.1', retries: 1, started: '09:14:36', finished: '09:14:40',
    input: { chunks: ['CHK-0041', 'CHK-0088', 'CHK-0019'] },
    output: { root_cause: 'tenant_id missing from auth_headers fixture', affected_file: 'tests/conftest.py', line: 12 } },
  { agent: 'Verifier', step: 'verify_evidence', status: 'completed', latency: '1.82s', tokens: 1932, cost: '$0.0029', promptVer: 'v2.0', retries: 0, started: '09:14:40', finished: '09:14:42',
    input: { root_cause: 'tenant_id missing', candidate_fix: 'Add tenant_id to JWT payload' },
    output: { verified: true, cross_references: 2, confidence: 0.94 } },
  { agent: 'Reporter', step: 'write_report', status: 'completed', latency: '3.09s', tokens: 3847, cost: '$0.0058', promptVer: 'v2.2', retries: 0, started: '09:14:42', finished: '09:14:45',
    input: { root_cause: 'tenant_id missing', confidence: 0.94 },
    output: { report_id: 'RPT-041', word_count: 312, sections: 5 } },
]

function JsonViewer({ data }: { data: object }) {
  return (
    <pre className="text-[10px] font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2.5 overflow-auto leading-relaxed">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function AgentTraceTab() {
  const [exp, setExp] = useState<number | null>(null)
  const totalCost = traceSteps.reduce((a, s) => a + parseFloat(s.cost.replace('$', '')), 0)
  const totalTokens = traceSteps.reduce((a, s) => a + s.tokens, 0)

  return (
    <div className="flex flex-col gap-3 max-w-4xl">
      {/* Warning */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-[12px] text-slate-600">
        <I.warn/><span>Structured trace only. Private model reasoning is never displayed.</span>
      </div>

      {/* Summary bar */}
      <Card className="px-4 py-2.5 flex items-center gap-6">
        {[
          ['Run', 'RPT-041 · Aug 3, 09:14'], ['Total latency', '13.32s'], ['Total tokens', totalTokens.toLocaleString()],
          ['Total cost', `$${totalCost.toFixed(4)}`], ['Model', 'claude-opus-5'], ['Steps', '6'],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{k}</div>
            <div className="text-[12px] font-semibold text-slate-800 font-mono">{v}</div>
          </div>
        ))}
      </Card>

      {/* Timeline */}
      {traceSteps.map((step, i) => (
        <div key={i} className="relative">
          {i < traceSteps.length - 1 && <div className="absolute left-[18px] top-11 bottom-0 w-px bg-slate-200 z-0"/>}
          <Card className="relative z-10">
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExp(exp === i ? null : i)}>
              <div className="w-5 h-5 rounded-full border-2 border-green-500 bg-green-50 flex items-center justify-center shrink-0"><I.check/></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-slate-900">{step.agent}</span>
                  <code className="text-[10px] font-mono text-slate-400">{step.step}</code>
                  {step.retries > 0 && <Badge label={`${step.retries} retry`} variant="amber"/>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono text-slate-500">
                <span title="Tokens">⬡ {step.tokens.toLocaleString()}</span>
                <span title="Cost">{step.cost}</span>
                <span title="Prompt version" className="text-slate-400">{step.promptVer}</span>
                <Badge label="Completed" variant="green"/>
                <span className="text-slate-400">{step.latency}</span>
                {exp === i ? <I.chevD/> : <I.chevR/>}
              </div>
            </div>
            {exp === i && (
              <div className="border-t border-slate-100 px-4 py-3">
                <div className="grid grid-cols-5 gap-3 mb-3">
                  {[
                    ['Started', step.started], ['Finished', step.finished], ['Latency', step.latency],
                    ['Tokens', step.tokens.toLocaleString()], ['Cost', step.cost],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{k}</div>
                      <div className="text-[11px] font-mono text-slate-700">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Input</div><JsonViewer data={step.input}/></div>
                  <div><div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Output</div><JsonViewer data={step.output}/></div>
                </div>
              </div>
            )}
          </Card>
        </div>
      ))}

      <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
        <span>6 steps · 13.32s · {totalTokens.toLocaleString()} tokens · ${totalCost.toFixed(4)} total</span>
        <button className="text-blue-600 hover:underline">Export trace JSON</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Workspace Screen
// ═══════════════════════════════════════════════════════════════════════════════
function WorkspaceScreen({ go }: { go: (s: Screen) => void }) {
  const [tab, setTab] = useState<WorkspaceTab>('overview')

  const renderTab = () => {
    switch (tab) {
      case 'overview': return <OverviewTab setTab={setTab}/>
      case 'repositories': return <RepositoriesTab/>
      case 'logs': return <LogsTab/>
      case 'source': return <SourceExplorerTab/>
      case 'chunks': return <ChunksTab/>
      case 'embeddings': return <EmbeddingsTab/>
      case 'git-diff': return <GitDiffTab/>
      case 'analysis': return <AnalysisTab setTab={setTab}/>
      case 'report': return <ReportTab/>
      case 'report-history': return <ReportHistoryTab setTab={setTab}/>
      case 'trace': return <AgentTraceTab/>
      default: return <OverviewTab setTab={setTab}/>
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <ProjectSidebar tab={tab} setTab={setTab} onBack={() => go('projects')}/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar breadcrumb={<>
          <button onClick={() => go('projects')} className="hover:text-slate-700 transition-colors">Projects</button>
          <I.chevR/>
          <span className="text-slate-900 font-medium">payments-api</span>
        </>}/>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center"><I.folder/></div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-slate-900">payments-api</span>
                <Badge label="Failed" variant="red" dot/>
              </div>
              <div className="text-[11px] text-slate-500">github.com/acme/payments-api · main · 4 repos · Last run 12 min ago</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="secondary" size="xs">Settings</Btn>
            <Btn variant="primary" size="xs" icon={<I.play/>} onClick={() => setTab('analysis')}>Run Agent</Btn>
          </div>
        </div>
        <main className="flex-1 overflow-auto p-5">{renderTab()}</main>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Root
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  if (screen === 'login') return <LoginScreen go={setScreen}/>
  if (screen === 'projects') return <ProjectsScreen go={setScreen}/>
  return <WorkspaceScreen go={setScreen}/>
}
