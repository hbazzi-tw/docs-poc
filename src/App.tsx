import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { TemplateList } from './routes/TemplateList';
import { TemplateEditor } from './routes/TemplateEditor';
import { ClauseLibrary } from './routes/ClauseLibrary';
import { ClauseEditor } from './routes/ClauseEditor';
import { DocumentGenerator } from './routes/DocumentGenerator';
import { PeopleList } from './routes/PeopleList';
import { PersonEditor } from './routes/PersonEditor';
import { InventoryList } from './routes/InventoryList';
import { InventoryEditor } from './routes/InventoryEditor';
import { resetStore } from './store/store';
import { resetPeople } from './store/people';
import { resetInventory } from './store/inventory';

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>🧙 T&amp;W AST Document POC</h1>
        <nav>
          <NavLink to="/templates" className={({ isActive }) => isActive ? 'active' : ''}>Templates</NavLink>
          <NavLink to="/clauses" className={({ isActive }) => isActive ? 'active' : ''}>Clauses</NavLink>
          <NavLink to="/people" className={({ isActive }) => isActive ? 'active' : ''}>People</NavLink>
          <NavLink to="/inventory" className={({ isActive }) => isActive ? 'active' : ''}>Inventory</NavLink>
          <NavLink to="/generate" className={({ isActive }) => isActive ? 'active' : ''}>Generate Document</NavLink>
        </nav>
        <span className="spacer" />
        <button className="ghost" onClick={() => { if (confirm('Reset all templates, clauses, people, and inventory to seed?')) { resetStore(); resetPeople(); resetInventory(); location.reload(); } }}>
          ↻ reset seed
        </button>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/templates" replace />} />
          <Route path="/templates" element={<TemplateList />} />
          <Route path="/templates/:id" element={<TemplateEditor />} />
          <Route path="/clauses" element={<ClauseLibrary />} />
          <Route path="/clauses/:id/:version" element={<ClauseEditor />} />
          <Route path="/people" element={<PeopleList />} />
          <Route path="/people/:guid" element={<PersonEditor />} />
          <Route path="/inventory" element={<InventoryList />} />
          <Route path="/inventory/:id" element={<InventoryEditor />} />
          <Route path="/generate" element={<DocumentGenerator />} />
          <Route path="/generate/:templateId" element={<DocumentGenerator />} />
        </Routes>
      </main>
    </div>
  );
}
