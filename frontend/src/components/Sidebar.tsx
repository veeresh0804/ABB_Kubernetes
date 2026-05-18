import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Target, Zap,
  Brain, Binary, Fingerprint,
  Network, Globe, Microscope,
  TestTube2, History, Activity,
  Terminal, ShieldCheck,
  Cpu, Heart, MessageSquare, BarChart3
} from 'lucide-react';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const NavLinkItem = ({ to, icon, label }: NavItemProps) => (
  <NavLink to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end={to === '/'}>
    {icon}
    <span>{label}</span>
  </NavLink>
);

export const Sidebar: React.FC = () => {
  return (
    <aside className="aether-sidebar">
      <nav className="sidebar-nav">
        <div className="nav-group">
          <div className="nav-group-title">OVERVIEW</div>
          <NavLinkItem to="/" icon={<Target size={16} />} label="Command Center" />
          <NavLinkItem to="/dashboard" icon={<LayoutDashboard size={16} />} label="Live Dashboard" />
          <NavLinkItem to="/mission" icon={<Activity size={16} />} label="Cluster Status" />
        </div>

        <div className="nav-group">
          <div className="nav-group-title">INTELLIGENCE</div>
          <NavLinkItem to="/agents" icon={<Cpu size={16} />} label="AI Agents" />
          <NavLinkItem to="/cognition/mesh" icon={<Brain size={16} />} label="Agent Mesh" />
          <NavLinkItem to="/cognition/prediction" icon={<Binary size={16} />} label="Predictions" />
          <NavLinkItem to="/nlp" icon={<MessageSquare size={16} />} label="NLP Query" />
        </div>

        <div className="nav-group">
          <div className="nav-group-title">INFRASTRUCTURE</div>
          <NavLinkItem to="/dependencies" icon={<Network size={16} />} label="Dependency Map" />
          <NavLinkItem to="/namespaces" icon={<Globe size={16} />} label="Namespaces" />
          <NavLinkItem to="/intelligence/causal" icon={<Binary size={16} />} label="Causal Analysis" />
        </div>

        <div className="nav-group">
          <div className="nav-group-title">SIMULATION</div>
          <NavLinkItem to="/simulation/twin" icon={<Microscope size={16} />} label="Digital Twin" />
          <NavLinkItem to="/simulation/scenarios" icon={<TestTube2 size={16} />} label="Scenarios" />
        </div>

        <div className="nav-group">
          <div className="nav-group-title">OPERATIONS</div>
          <NavLinkItem to="/replay" icon={<History size={16} />} label="Incident Timeline" />
          <NavLinkItem to="/memory" icon={<History size={16} />} label="Incident Archive" />
          <NavLinkItem to="/intelligence/logs" icon={<Terminal size={16} />} label="Semantic Logs" />
        </div>

        <div className="nav-group">
          <div className="nav-group-title">SYSTEM</div>
          <NavLinkItem to="/governance" icon={<Fingerprint size={16} />} label="Governance" />
          <NavLinkItem to="/system/health" icon={<Heart size={16} />} label="System Health" />
          <NavLinkItem to="/executive" icon={<ShieldCheck size={16} />} label="Executive View" />
        </div>
      </nav>
    </aside>
  );
};
