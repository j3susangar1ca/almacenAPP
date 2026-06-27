import React, { useState } from 'react';
import { 
  FileText, 
  Send, 
  UserCheck, 
  Gavel, 
  Cpu, 
  FileCheck, 
  Mail, 
  Plus, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Loader,
  Award,
  BookOpen
} from 'lucide-react';
import { Tender, Bid, Supplier, Budget, UserRole, TenderStatus } from '../types';

interface ProcurementTabProps {
  tenders: Tender[];
  bids: Bid[];
  suppliers: Supplier[];
  budgets: Budget[];
  role: UserRole;
  onUpdateTender: (id: string, updates: Partial<Tender>) => Promise<void>;
  onAddTender: (tender: Tender) => Promise<void>;
  onAddBid: (bid: Bid) => Promise<void>;
  onCommitBudget: (budgetCode: string, amount: number) => Promise<void>;
}

export default function ProcurementTab({
  tenders,
  bids,
  suppliers,
  role,
  onUpdateTender,
  onAddTender,
  onAddBid,
  onCommitBudget
}: ProcurementTabProps) {
  
  // Selection
  const [selectedTenderId, setSelectedTenderId] = useState<string>(tenders[0]?.id || '');
  const activeTender = tenders.find(t => t.id === selectedTenderId);
  const tenderBids = bids.filter(b => b.tenderId === selectedTenderId);

  // Form states for new Tender
  const [showNewTenderForm, setShowNewTenderForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newBudgetCode, setNewBudgetCode] = useState('P-101');
  const [newBudgetAmount, setNewBudgetAmount] = useState<number>(0);
  const [newDeadline, setNewDeadline] = useState('2026-07-20');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState<number>(0);
  const [newItemCost, setNewItemCost] = useState<number>(0);

  // Form states for adding a Bid
  const [showBidForm, setShowBidForm] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [bidSummary, setBidSummary] = useState('');

  // AI evaluation results
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiError, setAiError] = useState('');

  // Document/Email Integration states
  const [docsLink, setDocsLink] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);

  // Execute Gemini Procurement Evaluation
  const handleAIEvaluation = async () => {
    if (!activeTender || tenderBids.length === 0) return;
    setAiLoading(true);
    setAiResult(null);
    setAiError('');

    try {
      const res = await fetch('/api/gemini/procurement-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tender: activeTender,
          bids: tenderBids
        })
      });
      const data = await res.json();
      if (data.error) {
        setAiError(data.error);
      } else {
        setAiResult(data);
      }
    } catch (err: any) {
      setAiError(err.message || 'Error invocando Procurement AI.');
    } finally {
      setAiLoading(false);
    }
  };

  // State machine transition
  const handleTransitionStatus = async (newStatus: TenderStatus) => {
    if (!activeTender) return;
    await onUpdateTender(activeTender.id, { status: newStatus });
  };

  // Award Tender & Google Doc / Gmail Integration
  const handleAwardAndGenerateContract = async (winnerBid: Bid, legalJustification: string) => {
    if (!activeTender) return;
    setSyncLoading(true);
    setDocsLink('');

    try {
      // 1. Update Tender as Awarded in Firestore
      await onUpdateTender(activeTender.id, {
        status: 'Adjudicada',
        winnerSupplierId: winnerBid.supplierId,
        winnerSupplierName: winnerBid.supplierName,
        finalCost: winnerBid.amount,
        legalJustification: legalJustification || 'Adjudicación aprobada tras evaluación técnica integral con IA.'
      });

      // 2. Commit budget
      await onCommitBudget(activeTender.budgetCode, winnerBid.amount);

      // 3. Call server-side Doc compilation
      const googleToken = localStorage.getItem('google_access_token') || '';
      const docRes = await fetch('/api/workspace/generate-doc', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${googleToken}`
        },
        body: JSON.stringify({
          title: `Acta de Adjudicación - Licitación ${activeTender.id}`,
          contentTags: {
            "{{PROVEEDOR}}": winnerBid.supplierName,
            "{{RUC}}": "RUC 20554488331",
            "{{MONTO}}": `S/. ${winnerBid.amount.toLocaleString()}`,
            "{{JUSTIFICACION}}": legalJustification || 'Cumplimiento de bases técnicas.'
          }
        })
      });
      const docData = await docRes.json();
      if (docData.success) {
        setDocsLink(docData.url);
      }

      // 4. Dispatch Email to winner
      await fetch('/api/workspace/send-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${googleToken}`
        },
        body: JSON.stringify({
          to: 'ganador_licitacion@sigalerp.gob.pe',
          subject: `NOTIFICACIÓN OFICIAL: Adjudicación de Licitación ${activeTender.id}`,
          htmlBody: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #18181b;">SIGAL V2 ERP - Dirección de Adquisiciones</h2>
              <p>Estimado Representante de <b>${winnerBid.supplierName}</b>,</p>
              <p>Nos complace notificarle oficialmente que su oferta para la licitación <b>"${activeTender.title}"</b> ha sido seleccionada como la ganadora.</p>
              <table style="border-collapse: collapse; width: 100%; font-size: 13px; margin: 15px 0;">
                <tr style="background-color: #f8fafc;"><td style="padding: 8px; border: 1px solid #cbd5e1;">Código de Licitación</td><td style="padding: 8px; border: 1px solid #cbd5e1;"><b>${activeTender.id}</b></td></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Monto Adjudicado</td><td style="padding: 8px; border: 1px solid #cbd5e1; color: #18181b;"><b>S/. ${winnerBid.amount.toLocaleString()}</b></td></tr>
                <tr style="background-color: #f8fafc;"><td style="padding: 8px; border: 1px solid #cbd5e1;">Justificación Legal</td><td style="padding: 8px; border: 1px solid #cbd5e1;">${legalJustification || 'Evaluación cuantitativa favorable.'}</td></tr>
              </table>
              <p>El Acta Contractual ha sido redactada y subida a Google Drive. Por favor acérquese a firmar el documento.</p>
              <p>Atentamente,<br/><b>Dirección de Compras Públicas</b></p>
            </div>
          `
        })
      });

    } catch (err) {
      console.error(err);
    } finally {
      setSyncLoading(false);
    }
  };

  // Save new Tender
  const handleCreateTender = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTender: Tender = {
      id: `TND-0${tenders.length + 1}`,
      title: newTitle,
      description: newDesc,
      budgetCode: newBudgetCode,
      budgetAmount: newBudgetAmount,
      status: 'Borrador',
      deadline: newDeadline,
      items: [
        { name: newItemName, quantity: newItemQty, targetUnitCost: newItemCost }
      ],
      createdAt: new Date().toISOString()
    };
    await onAddTender(newTender);
    setSelectedTenderId(newTender.id);
    setShowNewTenderForm(false);
  };

  // Save new Bid
  const handleCreateBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTender) return;
    const sup = suppliers.find(s => s.id === selectedSupplierId);
    if (!sup) return;

    const newBid: Bid = {
      id: `BID-0${bids.length + 1}`,
      tenderId: activeTender.id,
      supplierId: selectedSupplierId,
      supplierName: sup.name,
      amount: bidAmount,
      proposalSummary: bidSummary,
      docUrl: 'https://docs.google.com/document/d/mock_doc/edit',
      status: 'PENDING'
    };
    await onAddBid(newBid);
    setShowBidForm(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Sidebar: Public Tenders List */}
      <div className="bg-white border border-[#E4E4E7] p-4 rounded-lg space-y-4 h-fit shadow-xs">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">Licitaciones Públicas</h3>
          <button
            onClick={() => setShowNewTenderForm(true)}
            className="text-[10px] bg-[#18181B] hover:bg-black text-white font-bold uppercase tracking-wider py-1 px-2.5 rounded-md flex items-center space-x-1 transition-colors"
          >
            <Plus className="h-3 w-3" />
            <span>Crear Licitación</span>
          </button>
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {tenders.map(t => {
            const isSelected = t.id === selectedTenderId;
            return (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTenderId(t.id);
                  setAiResult(null);
                  setDocsLink('');
                }}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-[#FAFAFA] border-[#18181B] text-[#18181B]' 
                    : 'bg-white border-[#E4E4E7] text-[#71717A] hover:border-[#18181B]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono text-[#18181B] font-bold">{t.id}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider ${
                    t.status === 'Borrador' ? 'bg-zinc-100 text-zinc-700 border border-zinc-200' :
                    t.status === 'Publicada' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    t.status === 'Evaluación' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <h4 className="font-bold text-xs mt-2 text-[#18181B] truncate">{t.title}</h4>
                <p className="text-[10px] text-[#71717A] mt-1 font-mono">Presupuesto Base: S/. <span className="tabular-numbers">{t.budgetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Panel: Selected Tender workflow */}
      <div className="bg-white border border-[#E4E4E7] p-5 rounded-lg lg:col-span-2 space-y-6 shadow-xs">
        {activeTender ? (
          <>
            {/* Tender Header & Machine state */}
            <div className="flex flex-col md:flex-row md:justify-between border-b border-[#E4E4E7] pb-4 gap-2">
              <div>
                <span className="text-[10px] font-mono text-[#71717A] font-bold">{activeTender.id} | Partida {activeTender.budgetCode}</span>
                <h2 className="text-sm font-bold text-[#18181B] uppercase tracking-tight mt-0.5">{activeTender.title}</h2>
                <p className="text-xs text-[#71717A] italic mt-1">"{activeTender.description}"</p>
              </div>

              {/* State Transitions */}
              <div className="flex flex-wrap items-center gap-1.5 self-start">
                {activeTender.status === 'Borrador' && (
                  <button
                    onClick={() => handleTransitionStatus('Publicada')}
                    className="bg-[#18181B] hover:bg-black text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm text-white flex items-center transition-colors"
                  >
                    Publicar bases <ChevronRight className="h-3 w-3 ml-0.5" />
                  </button>
                )}
                {activeTender.status === 'Publicada' && (
                  <button
                    onClick={() => handleTransitionStatus('Evaluación')}
                    className="bg-[#18181B] hover:bg-black text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm text-white flex items-center transition-colors"
                  >
                    Cerrar y Evaluar <ChevronRight className="h-3 w-3 ml-0.5" />
                  </button>
                )}
                <span className="text-[10px] text-[#71717A] font-mono font-bold uppercase tracking-wider">Bases cierran: {activeTender.deadline}</span>
              </div>
            </div>

            {/* List of items requested in this Tender */}
            <div className="bg-[#FAFAFA] border border-[#E4E4E7] p-3.5 rounded-lg space-y-2">
              <h4 className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider flex items-center space-x-1.5">
                <BookOpen className="h-3.5 w-3.5 text-[#18181B]" />
                <span>Víveres Requeridos en Pliego</span>
              </h4>
              {activeTender.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-mono border-t border-[#E4E4E7] pt-2 first:border-0 first:pt-0">
                  <span className="text-[#18181B] font-sans font-medium">{item.name}</span>
                  <span className="text-[#71717A]">Cantidad: <b className="text-[#18181B] tabular-numbers">{item.quantity}</b> | Costo Max: S/. <span className="text-[#18181B] font-bold tabular-numbers">{item.targetUnitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
                </div>
              ))}
            </div>

            {/* Procurement Bids list */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">Ofertas de Proveedores</h3>
                {activeTender.status === 'Publicada' && (
                  <button
                    onClick={() => setShowBidForm(true)}
                    className="text-[10px] bg-white border border-[#E4E4E7] text-[#18181B] hover:bg-[#FAFAFA] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider flex items-center space-x-1 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Registrar Oferta</span>
                  </button>
                )}
              </div>

              {tenderBids.length === 0 ? (
                <div className="p-6 text-center text-[#71717A] text-xs bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg">
                  No se han registrado ofertas económicas para esta licitación aún.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tenderBids.map(bid => {
                    const isWinner = activeTender.winnerSupplierId === bid.supplierId;
                    return (
                      <div key={bid.id} className={`p-4 rounded-lg border flex flex-col justify-between shadow-2xs ${
                        isWinner ? 'bg-green-50 border-green-300' : 'bg-white border-[#E4E4E7]'
                      }`}>
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="text-xs font-bold text-[#18181B]">{bid.supplierName}</h4>
                            <span className="text-xs font-mono font-bold text-[#18181B] tabular-numbers">S/. {bid.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <p className="text-[11px] text-[#71717A] italic mt-2">"{bid.proposalSummary}"</p>
                        </div>

                        {/* Actions per Bid (Awarding / AI Review) */}
                        <div className="mt-4 flex justify-between items-center border-t border-[#E4E4E7] pt-3">
                          <span className="text-[10px] text-[#71717A] font-mono">{bid.id}</span>
                          
                          {activeTender.status === 'Evaluación' && (
                            <button
                              onClick={() => handleAwardAndGenerateContract(bid, aiResult?.recommendation?.justification)}
                              className="bg-[#18181B] hover:bg-black text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm text-white flex items-center space-x-1 transition-colors"
                            >
                              <Award className="h-3.5 w-3.5" />
                              <span>Adjudicar Licitación</span>
                            </button>
                          )}

                          {isWinner && (
                            <span className="text-[10px] text-green-700 font-bold flex items-center space-x-1 uppercase tracking-wider">
                              <FileCheck className="h-4 w-4 text-green-600" />
                              <span>Ganadora</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI Review section with Gemini */}
            {activeTender.status === 'Evaluación' && tenderBids.length > 0 && (
              <div className="bg-[#FAFAFA] border border-[#E4E4E7] p-4 rounded-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div>
                    <h3 className="text-[10px] font-bold text-[#18181B] flex items-center space-x-1.5 uppercase tracking-wider">
                      <Cpu className="h-4 w-4" />
                      <span>Procurement AI / Legal AI (Asesor Gemini)</span>
                    </h3>
                    <p className="text-[10px] text-[#71717A] mt-0.5">Compara desviaciones de costo y genera justificación legal del acta</p>
                  </div>

                  <button
                    onClick={handleAIEvaluation}
                    disabled={aiLoading}
                    className="bg-[#18181B] hover:bg-black disabled:bg-[#F4F4F5] text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-sm text-white flex items-center space-x-1 transition-colors self-start"
                  >
                    {aiLoading ? (
                      <>
                        <Loader className="h-3.5 w-3.5 animate-spin" />
                        <span>Analizando pliegos...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Evaluar con IA</span>
                      </>
                    )}
                  </button>
                </div>

                {aiError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm">
                    {aiError}
                  </div>
                )}

                {aiResult && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aiResult.evaluations?.map((ev: any, idx: number) => (
                        <div key={idx} className="p-3 bg-white border border-[#E4E4E7] rounded-sm">
                          <div className="flex justify-between border-b border-[#E4E4E7] pb-1.5 mb-2">
                            <span className="font-bold text-[#18181B]">{ev.supplierName}</span>
                            <span className="font-mono text-[#18181B] font-bold">Puntaje: {ev.score}/100</span>
                          </div>
                          <div className="space-y-1 text-[11px] text-[#71717A]">
                            <span className="text-[#18181B] font-mono">Desviación: {ev.deviation}</span>
                            <p className="text-[#27272A] mt-1"><b>Fortalezas:</b> {ev.pros?.join(', ')}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-sm">
                      <h4 className="font-bold text-blue-800 flex items-center space-x-1 text-[10px] uppercase tracking-wider">
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Recomendación de Adjudicación</span>
                      </h4>
                      <p className="text-blue-900 mt-2"><b>Ganador sugerido:</b> {aiResult.recommendation?.winnerSupplierName}</p>
                      <p className="text-blue-800 mt-1 leading-relaxed italic">" {aiResult.recommendation?.justification} "</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Integration Results (Google Workspace output) */}
            {activeTender.status === 'Adjudicada' && (
              <div className="bg-[#FAFAFA] border border-[#E4E4E7] p-4 rounded-sm space-y-3">
                <h4 className="text-[10px] font-bold text-[#18181B] flex items-center space-x-1.5 uppercase tracking-wider">
                  <FileCheck className="h-4 w-4 text-green-600" />
                  <span>Sincronización Legal con Google Workspace</span>
                </h4>
                
                {syncLoading ? (
                  <div className="flex items-center space-x-2 text-xs text-[#71717A] py-2">
                    <Loader className="h-4 w-4 animate-spin text-[#18181B]" />
                    <span>Redactando Acta Contractual en Google Docs y notificando vía Gmail...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[#27272A]">
                      El proceso de adjudicación legal ha finalizado de forma atómica. Se han generado las salidas documentales para auditoría corporativa.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {docsLink && (
                        <a
                          href={docsLink}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-white hover:bg-[#F4F4F5] text-xs px-3 py-1.5 rounded-sm text-[#18181B] border border-[#E4E4E7] flex items-center space-x-1.5 font-bold uppercase tracking-wider transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-[#18181B]" />
                          <span>Abrir Acta de Adjudicación (Docs)</span>
                        </a>
                      )}
                      <span className="bg-green-50 text-green-700 border border-green-200 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-sm flex items-center space-x-1">
                        <Mail className="h-3.5 w-3.5" />
                        <span>Notificación Gmail despachada</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center p-12 text-[#71717A] font-medium text-xs">
            No se registran licitaciones activas. Use el botón "Crear Licitación" para lanzar una.
          </div>
        )}
      </div>

      {/* New Tender Modal */}
      {showNewTenderForm && (
        <div className="fixed inset-0 z-50 bg-[#18181B]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E4E7] rounded-sm w-full max-w-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E4E4E7] flex justify-between items-center bg-[#FAFAFA]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center space-x-1.5">
                <Gavel className="h-4 w-4 text-[#18181B]" />
                <span>Crear Nueva Licitación de Víveres</span>
              </h3>
              <button onClick={() => setShowNewTenderForm(false)} className="text-[#71717A] hover:text-[#18181B] font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateTender} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[#71717A] font-bold uppercase tracking-wider">Título del pliego</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="E.g. Suministro trimestral de arroz para pabellones..."
                  className="bg-white border border-[#E4E4E7] rounded-sm p-2.5 w-full text-[#18181B] focus:outline-none focus:border-[#18181B] transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#71717A] font-bold uppercase tracking-wider">Descripción Técnica</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Justificación del concurso público..."
                  className="bg-white border border-[#E4E4E7] rounded-sm p-2.5 w-full text-[#18181B] focus:outline-none focus:border-[#18181B] transition-colors"
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[#71717A] font-bold uppercase tracking-wider">Partida Presupuestal</label>
                  <select
                    value={newBudgetCode}
                    onChange={(e) => setNewBudgetCode(e.target.value)}
                    className="bg-white border border-[#E4E4E7] rounded-sm p-2.5 w-full text-[#18181B] focus:outline-none"
                  >
                    <option value="P-101">P-101 - Víveres Básicos</option>
                    <option value="P-102">P-102 - Logística</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#71717A] font-bold uppercase tracking-wider">Presupuesto Límite (S/.)</label>
                  <input
                    type="number"
                    value={newBudgetAmount === 0 ? '' : newBudgetAmount}
                    onChange={(e) => setNewBudgetAmount(Number(e.target.value))}
                    className="bg-white border border-[#E4E4E7] rounded-sm p-2.5 w-full text-[#18181B] focus:outline-none focus:border-[#18181B] transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="border-t border-[#E4E4E7] pt-3 space-y-3">
                <h4 className="font-bold text-[#18181B] uppercase tracking-wider text-[10px]">Artículo Requerido</h4>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="E.g. Arroz Extra"
                    className="bg-white border border-[#E4E4E7] rounded-sm p-2 w-full text-[#18181B] col-span-1 focus:outline-none focus:border-[#18181B]"
                    required
                  />
                  <input
                    type="number"
                    value={newItemQty === 0 ? '' : newItemQty}
                    onChange={(e) => setNewItemQty(Number(e.target.value))}
                    placeholder="Cant (Sacos)"
                    className="bg-white border border-[#E4E4E7] rounded-sm p-2 w-full text-[#18181B] focus:outline-none focus:border-[#18181B]"
                    required
                  />
                  <input
                    type="number"
                    value={newItemCost === 0 ? '' : newItemCost}
                    onChange={(e) => setNewItemCost(Number(e.target.value))}
                    placeholder="Unit Cost S/."
                    className="bg-white border border-[#E4E4E7] rounded-sm p-2 w-full text-[#18181B] focus:outline-none focus:border-[#18181B]"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => setShowNewTenderForm(false)}
                  className="bg-white border border-[#E4E4E7] text-[#18181B] hover:bg-[#F4F4F5] px-4 py-2 rounded-sm font-bold uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#18181B] hover:bg-black text-white px-5 py-2 rounded-sm font-bold uppercase tracking-wider transition-colors"
                >
                  Crear Licitación Pública
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Bid Modal */}
      {showBidForm && (
        <div className="fixed inset-0 z-50 bg-[#18181B]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E4E7] rounded-sm w-full max-w-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E4E4E7] flex justify-between items-center bg-[#FAFAFA]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center space-x-1.5">
                <Send className="h-4 w-4 text-[#18181B]" />
                <span>Presentar Oferta Económica</span>
              </h3>
              <button onClick={() => setShowBidForm(false)} className="text-[#71717A] hover:text-[#18181B] font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateBid} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[#71717A] font-bold uppercase tracking-wider">Seleccionar Proveedor Homologado</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="bg-white border border-[#E4E4E7] rounded-sm p-2.5 w-full text-[#18181B] focus:outline-none"
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (RUC: {s.ruc})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#71717A] font-bold uppercase tracking-wider">Monto de la Oferta Contractual (S/.)</label>
                <input
                  type="number"
                  value={bidAmount === 0 ? '' : bidAmount}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  placeholder="Ingrese total de la propuesta..."
                  className="bg-white border border-[#E4E4E7] rounded-sm p-2.5 w-full text-[#18181B] focus:outline-none focus:border-[#18181B] transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#71717A] font-bold uppercase tracking-wider">Resumen de Propuesta / Propiedades Técnicas</label>
                <textarea
                  value={bidSummary}
                  onChange={(e) => setBidSummary(e.target.value)}
                  placeholder="Detalle de plazos de entrega, garantías, calidad agropecuaria..."
                  className="bg-white border border-[#E4E4E7] rounded-sm p-2.5 w-full text-[#18181B] focus:outline-none focus:border-[#18181B] transition-colors"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => setShowBidForm(false)}
                  className="bg-white border border-[#E4E4E7] text-[#18181B] hover:bg-[#F4F4F5] px-4 py-2 rounded-sm font-bold uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#18181B] hover:bg-black text-white px-5 py-2 rounded-sm font-bold uppercase tracking-wider transition-colors"
                >
                  Registrar Oferta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
