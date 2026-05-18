import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Target, Zap, 
  Brain, Binary, Fingerprint, 
  Network, Globe, Microscope, 
  TestTube2, History, Activity, 
  Terminal, BarChart3, ShieldCheck, 
  Cpu, Heart, MessageSquare
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
          <div className="nav-group-title">MISSION CONTROL</div>
          <NavLinkItem to="/" icon={<LayoutDashboard size={16} />} label="Command Center" />
          <NavLinkItem to="/executive" icon={<Target size={16} />} label="Executive Operations" />
          <NavLinkItem to="/mission" icon={<Activity size={16} />} label="Live Cluster" />
        </div>

        <div className="nav-group">
          <div className="nav-group-title">COGNITION</div>
          <NavLinkItem to="/cognition/mesh" icon={<Brain size={16} />} label="AI Mesh" />
          <NavLinkItem to="/cognition/prediction" icon={<Binary size={16} />} label="Prediction Fabric" />
          <NavLinkItem to="/governance" icon={<Fingerprint size={16} />} label="Trust & Governance" />
        </div>

        <div className="nav-group">
          <div className="nav-group-title">INFRASTRUCTURE</div>
          <NavLinkItem to="/dependencies" icon={<Network size={16} />} label="Infrastructure Fabric" />
          <NavLinkItem to="/namespaces" icon={<Globe size={16} />} label="Namespace Intelligence" />
        </div>

        <div className="nav-group">
          <div className="nav-group-title">SIMULATION</div>
          <NavLinkItem to="/simulation/twin" icon={<Microscope size={16} />} label="Digital Twin Lab" />
          <NavLinkItem to="/simulation/scenarios" icon={<TestTube2 size={16} />} label="Scenario Simulator" />
        </div>

        <div className="nav-group">
          <div className="nav-group-title">MEMORY</div>
          <NavLinkItem to="/memory" icon={<History size={16} />} label="Operational Memory" />
          <NavLinkItem to="/replay" icon={<Activity size={16} />} label="Incident Archive" />
        </div>

        <div className="nav-group">
          <div className="nav-group-title">INTELLIGENCE</div>
          <NavLinkItem to="/intelligence/logs" icon={<Terminal size={16} />} label="Semantic Logs" />
          <NavLinkItem to="/intelligence/causal" icon={<Zap size={16} />} label="Causal Analytics" />
        </div>

        <div className="nav-group">
          <div className="nav-group-title">SYSTEM</div>
          <NavLinkItem to="/system/health" icon={<Heart size={16} />} label="Runtime Health" />
          <NavLinkItem to="/agents" icon={<Cpu size={16} />} label="Agent Lifecycle" />
        </div>
      </nav>
    </aside>
  );
};
