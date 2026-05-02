import { useState, useEffect } from 'react';
import { useLeads } from './useLeads';
import { useDeals } from './useDeals';
import { useAuth } from '@/context/AuthContext';
import { LEAD_STATUS, DEAL_STAGE } from '@/lib/constants';

/**
 * useL2Copilot
 * 
 * This hook currently uses rule-based heuristics to generate insights
 * matching the L2 Conversion Agent prompt. 
 * 
 * Future LLM Integration:
 * To swap this with an LLM, replace the `generateInsights` logic with an API call 
 * passing the `leads` and `deals` context, and having the LLM return a JSON array
 * matching the `Insight` interface below.
 * 
 * Insight Interface:
 * {
 *   id: string (deal.id or lead.id),
 *   type: 'conversion' | 'risk' | 'proposal' | 'escalation',
 *   title: string (Lead or Deal name + Value),
 *   status: string (Current stage/status),
 *   insight: string (The AI insight),
 *   action: string (Recommended action)
 * }
 */
export function useL2Copilot() {
  const { user } = useAuth();
  const { data: myLeads = [], isLoading: loadingLeads } = useLeads({ level: 'l2', assignedTo: user?.id });
  const { data: myDeals = [], isLoading: loadingDeals } = useDeals({ assignedTo: user?.id });
  
  const [insights, setInsights] = useState([]);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    if (loadingLeads || loadingDeals) return;

    // Simulate LLM "thinking" time for effect and future compatibility
    setIsThinking(true);
    
    const timeout = setTimeout(() => {
      const newInsights = generateInsights(myLeads, myDeals);
      setInsights(newInsights);
      setIsThinking(false);
    }, 800);

    return () => clearTimeout(timeout);
  }, [myLeads, myDeals, loadingLeads, loadingDeals]);

  return { insights, isThinking };
}

function generateInsights(leads, deals) {
  const insights = [];
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  // 1. LEAD -> DEAL CONVERSION
  const leadsWithDeals = new Set(deals.map(d => d.lead_id));
  const qualifiedLeads = leads.filter(l => l.status === LEAD_STATUS.QUALIFIED && !leadsWithDeals.has(l.id || l._id));

  qualifiedLeads.forEach(lead => {
    let suggestedValue = lead.budget || 5000; // Default benchmark
    
    insights.push({
      id: lead.id || lead._id,
      type: 'conversion',
      title: `Lead: ${lead.name} (${lead.company || 'Unknown'})`,
      status: 'Qualified (No Deal)',
      insight: `Lead is qualified but has no active deal. Based on budget/benchmarks, suggested value is $${suggestedValue.toLocaleString()}.`,
      action: 'Create a deal and begin the sales pipeline.',
      metadata: { suggestedValue, leadId: lead.id || lead._id }
    });
  });

  // 2. PIPELINE MANAGEMENT & DEAL INTELLIGENCE
  deals.forEach(deal => {
    if (deal.status !== 'open') return;

    const daysSinceUpdate = (now - (deal.updated_at || deal.created_at)) / DAY_MS;
    
    // Stuck Deals
    if (daysSinceUpdate > 7) {
      insights.push({
        id: deal.id || deal._id,
        type: 'risk',
        title: `Deal: ${deal.lead?.name || 'Unknown'} ($${deal.value.toLocaleString()})`,
        status: deal.stage,
        insight: `This deal is stuck. No activity recorded in ${Math.floor(daysSinceUpdate)} days.`,
        action: 'Follow up immediately or mark as lost if unresponsive.',
        metadata: { dealId: deal.id || deal._id }
      });
    }

    // High Risk / Missing Data
    if (deal.stage === DEAL_STAGE.NEGOTIATION && !deal.lead?.decision_maker) {
      insights.push({
        id: deal.id || deal._id,
        type: 'risk',
        title: `Deal: ${deal.lead?.name || 'Unknown'} ($${deal.value.toLocaleString()})`,
        status: deal.stage,
        insight: `Deal is in Negotiation but the Decision Maker is missing or unverified. Risk is high.`,
        action: 'Identify and engage the economic buyer before sending final terms.',
        metadata: { dealId: deal.id || deal._id }
      });
    }

    // 3. PROPOSAL SUPPORT
    if (deal.stage === DEAL_STAGE.PROPOSAL) {
      const hasProposals = deal.proposals && deal.proposals.length > 0;
      if (!hasProposals) {
        insights.push({
          id: deal.id || deal._id,
          type: 'proposal',
          title: `Deal: ${deal.lead?.name || 'Unknown'} ($${deal.value.toLocaleString()})`,
          status: deal.stage,
          insight: `Deal reached Proposal stage but no proposal document has been generated yet.`,
          action: 'Generate a structured proposal with pricing breakdown and timeline.',
          metadata: { dealId: deal.id || deal._id }
        });
      }
    }

    // 4. ESCALATION READINESS
    if (deal.stage === DEAL_STAGE.READY_TO_CLOSE) {
      const unmet = [];
      if (!deal.proposals?.length) unmet.push('Proposal sent');
      if (!deal.lead?.decision_maker) unmet.push('Decision maker identified');
      if (!deal.lead?.budget) unmet.push('Budget confirmed');

      if (unmet.length > 0) {
        insights.push({
          id: deal.id || deal._id,
          type: 'escalation',
          title: `Deal: ${deal.lead?.name || 'Unknown'} ($${deal.value.toLocaleString()})`,
          status: deal.stage,
          insight: `Escalation blocked. Missing prerequisites: ${unmet.join(', ')}.`,
          action: 'Fulfill missing requirements before escalating to L3.',
          metadata: { dealId: deal.id || deal._id, unmet }
        });
      } else {
        insights.push({
          id: deal.id || deal._id,
          type: 'escalation',
          title: `Deal: ${deal.lead?.name || 'Unknown'} ($${deal.value.toLocaleString()})`,
          status: deal.stage,
          insight: `All prerequisites met. Deal is fully qualified for L3 handoff.`,
          action: 'Escalate deal to L3 Closing Agent.',
          metadata: { dealId: deal.id || deal._id, ready: true }
        });
      }
    }
  });

  // Sort insights: Escalation -> Conversion -> Risk -> Proposal
  const typeOrder = { escalation: 0, conversion: 1, risk: 2, proposal: 3 };
  insights.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

  return insights;
}
