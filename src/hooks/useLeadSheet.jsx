import { createContext, useContext, useState, useCallback } from 'react';

// ── Global LeadSheet state via React Context ──────────────────
// Provides openLead(id) / closeLead() to any component in the tree.

const LeadSheetContext = createContext(null);

export function LeadSheetProvider({ children }) {
  const [leadId, setLeadId] = useState(null);

  const openLead  = useCallback((id) => setLeadId(id), []);
  const closeLead = useCallback(() => setLeadId(null), []);

  return (
    <LeadSheetContext.Provider value={{ leadId, openLead, closeLead }}>
      {children}
    </LeadSheetContext.Provider>
  );
}

export function useLeadSheet() {
  const ctx = useContext(LeadSheetContext);
  if (!ctx) throw new Error('useLeadSheet must be used inside LeadSheetProvider');
  return ctx;
}
