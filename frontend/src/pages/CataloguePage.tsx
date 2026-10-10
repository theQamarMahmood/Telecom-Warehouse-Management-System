import React, { useEffect, useState } from 'react';
import {
  Tag,
  Plus,
  Search,
  Filter,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
  Radio,
  Zap,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  MapPin
} from 'lucide-react';
import { EquipmentCategory, EquipmentItem } from '../types';
import { apiRequest } from '../api';
import { EquipmentDetailModal } from '../components/EquipmentDetailModal';

export const CataloguePage: React.FC = () => {
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<EquipmentItem | null>(null);

  // Form state for creating equipment
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCatId, setFormCatId] = useState<number>(1);
  const [formMfr, setFormMfr] = useState('Ericsson');
  const [formModel, setFormModel] = useState('');
  const [formPartNo, setFormPartNo] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState('Remote Radio Unit (RRU)');
  const [formFreq, setFormFreq] = useState('1800/2100 MHz (B1/B3)');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formPower, setFormPower] = useState('460');
  const [formWeight, setFormWeight] = useState('17.0');
  const [formDims, setFormDims] = useState('380 x 335 x 135 mm');
  const [formTracking, setFormTracking] = useState('SERIALIZED');
  const [formUnitCost, setFormUnitCost] = useState('3450');
  const [formMinStock, setFormMinStock] = useState('10');
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      apiRequest<EquipmentCategory[]>('/catalogue/categories'),
      apiRequest<EquipmentItem[]>(`/catalogue/items${search ? `?search=${encodeURIComponent(search)}` : ''}`)
    ]).then(([cats, its]) => {
      setCategories(cats);
      setItems(its);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    try {
      await apiRequest('/catalogue/items', {
        method: 'POST',
        body: JSON.stringify({
          category_id: formCatId,
          sku: formSku,
          name: formName,
          manufacturer: formMfr,
          model_number: formModel,
          part_number: formPartNo || null,
          description: formDesc || null,
          equipment_type: formType || null,
          frequency_band: formFreq || null,
          image_url: formImageUrl || null,
          power_consumption_w: formPower ? parseFloat(formPower) : null,
          weight_kg: formWeight ? parseFloat(formWeight) : null,
          dimensions: formDims || null,
          tracking_mode: formTracking,
          unit_cost: parseFloat(formUnitCost) || 0,
          min_stock_level: parseInt(formMinStock) || 5,
        })
      });
      setFormMsg({ type: 'success', text: `Equipment SKU '${formSku}' registered successfully!` });
      setTimeout(() => {
        setShowAddModal(false);
        fetchData();
      }, 1000);
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message });
    }
  };

  const filteredItems = selectedCat
    ? items.filter((it) => it.category_id === selectedCat)
    : items;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <Tag className="w-5 h-5 text-cyan-400" />
            <span>Equipment Master Catalogue</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Telecom equipment master records with high-definition pictures, brief details, physical quantities, and technical specifications.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View mode toggle */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'grid' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Rich Picture Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'table' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Dense Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Equipment Master</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCat(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCat === null
              ? 'bg-cyan-500 text-slate-950'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          All Categories ({items.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCat(c.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCat === c.id
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {c.name} ({c.item_count})
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by equipment name, SKU, manufacturer, model, type..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span>{filteredItems.length} SKUs loaded</span>
          <button
            onClick={fetchData}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors"
            title="Refresh catalogue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* VIEW MODE: RICH EQUIPMENT CARDS WITH PICTURES & BRIEF SPECS */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredItems.map((it) => {
            const onHand = it.total_on_hand || 0;
            const avail = it.total_available || 0;
            const reserved = it.total_reserved || 0;
            const borrowed = it.total_borrowed || 0;
            const isLow = onHand <= it.min_stock_level;

            return (
              <div
                key={it.id}
                onClick={() => setSelectedDetailItem(it)}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition-all duration-200 cursor-pointer group flex flex-col shadow-lg"
              >
                {/* Equipment Picture Thumbnail Header */}
                <div className="h-44 w-full bg-slate-950 relative overflow-hidden flex items-center justify-center">
                  {it.image_url ? (
                    <img
                      src={it.image_url}
                      alt={it.name}
                      onError={(e) => {
                        // fallback if link fails
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : null}

                  {/* Fallback Icon if no image or image fails */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -z-10 bg-slate-950/60">
                    <Radio className="w-10 h-10 text-slate-700 mb-1" />
                    <span className="text-[10px] text-slate-600 font-bold uppercase">{it.manufacturer}</span>
                  </div>

                  {/* Gradient Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 pointer-events-none" />

                  {/* Tracking Mode Pill */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide backdrop-blur-md shadow-md ${
                      it.tracking_mode === 'SERIALIZED'
                        ? 'bg-purple-950/80 text-purple-300 border border-purple-500/50'
                        : 'bg-blue-950/80 text-blue-300 border border-blue-500/50'
                    }`}>
                      {it.tracking_mode}
                    </span>
                  </div>

                  {/* Category Pill */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 text-cyan-400 border border-slate-700/80 backdrop-blur-md">
                      {it.category_name}
                    </span>
                  </div>

                  {/* Floating Valuation & Type on image bottom */}
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between">
                    {it.equipment_type ? (
                      <span className="text-[11px] font-extrabold text-emerald-400 bg-slate-950/85 px-2 py-0.5 rounded border border-emerald-900/60 backdrop-blur-md truncate max-w-[180px]">
                        {it.equipment_type}
                      </span>
                    ) : <span />}
                    <span className="text-xs font-extrabold text-white bg-slate-950/85 px-2 py-0.5 rounded border border-slate-800 backdrop-blur-md">
                      ${it.unit_cost.toLocaleString()} {it.currency}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Item Title & SKU */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-white text-sm leading-snug group-hover:text-cyan-400 transition-colors line-clamp-1">
                        {it.name}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[11px] font-mono text-cyan-400 font-bold">{it.sku}</span>
                      <span className="text-[11px] text-slate-500">|</span>
                      <span className="text-[11px] text-slate-400">{it.manufacturer} • {it.model_number}</span>
                    </div>

                    {/* Brief Detail Description */}
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                      {it.description || 'Standard telecom infrastructure component.'}
                    </p>
                  </div>

                  {/* Specs Snippet Chips */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-1.5 flex items-center space-x-1.5">
                      <Radio className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="text-slate-300 truncate">{it.frequency_band || 'Carrier Band'}</span>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-1.5 flex items-center space-x-1.5">
                      <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-slate-300 truncate">
                        {it.power_consumption_w ? `${it.power_consumption_w}W` : 'Passive (0W)'}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Breakdown Box */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">Physical Stock:</span>
                      <div className="flex items-center space-x-1">
                        <strong className="text-white font-extrabold text-sm">{onHand}</strong>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{it.unit_of_measure}s</span>
                      </div>
                    </div>

                    {/* Progress distribution bar */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                      {avail > 0 && (
                        <div
                          style={{ width: `${Math.max(8, (avail / (onHand || 1)) * 100)}%` }}
                          className="bg-emerald-500 h-full"
                          title={`Available: ${avail}`}
                        />
                      )}
                      {reserved > 0 && (
                        <div
                          style={{ width: `${Math.max(8, (reserved / (onHand || 1)) * 100)}%` }}
                          className="bg-amber-500 h-full"
                          title={`Reserved: ${reserved}`}
                        />
                      )}
                      {borrowed > 0 && (
                        <div
                          style={{ width: `${Math.max(8, (borrowed / (onHand || 1)) * 100)}%` }}
                          className="bg-blue-500 h-full"
                          title={`Borrowed: ${borrowed}`}
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="text-emerald-400 font-semibold">
                        Available: <strong>{avail}</strong>
                      </span>
                      <span className="text-amber-400 font-semibold">
                        Reserved: <strong>{reserved}</strong>
                      </span>
                      <span className="text-blue-400 font-semibold">
                        Field: <strong>{borrowed}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[11px] text-slate-500">
                      Safety Min: <strong className="text-slate-300">{it.min_stock_level}</strong>
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDetailItem(it);
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Inspect Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW MODE: DENSE DATA TABLE WITH PHOTO THUMBNAIL */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Photo & Equipment</th>
                  <th className="py-3 px-4">SKU / Code</th>
                  <th className="py-3 px-4">Type & Frequency</th>
                  <th className="py-3 px-4">Tracking</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Physical On Hand</th>
                  <th className="py-3 px-4 text-right">Available</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredItems.map((it) => (
                  <tr
                    key={it.id}
                    onClick={() => setSelectedDetailItem(it)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {it.image_url ? (
                            <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                          ) : (
                            <Radio className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs line-clamp-1">{it.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {it.manufacturer} • {it.model_number}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{it.sku}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-200">{it.equipment_type || it.category_name}</div>
                      <div className="text-[11px] text-slate-400">{it.frequency_band || 'Standard Band'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        it.tracking_mode === 'SERIALIZED'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {it.tracking_mode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      ${it.unit_cost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-white text-sm">
                      {it.total_on_hand || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-400 text-sm">
                      {it.total_available || 0}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDetailItem(it);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 font-bold rounded-lg text-xs transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Equipment Detail Modal */}
      {selectedDetailItem && (
        <EquipmentDetailModal
          item={selectedDetailItem}
          onClose={() => setSelectedDetailItem(null)}
          onItemUpdated={() => {
            fetchData();
            // Refresh detail item
            apiRequest<EquipmentItem>(`/catalogue/items/${selectedDetailItem.id}`).then((updated) => {
              setSelectedDetailItem(updated);
            });
          }}
        />
      )}

      {/* Add Equipment Master Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Register New Telecom Equipment Master</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-5 overflow-y-auto space-y-4 text-xs">
              {formMsg && (
                <div className={`p-3 rounded-xl flex items-center space-x-2 ${
                  formMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}>
                  {formMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{formMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Equipment Category</label>
                  <select
                    value={formCatId}
                    onChange={(e) => setFormCatId(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Tracking Mode</label>
                  <select
                    value={formTracking}
                    onChange={(e) => setFormTracking(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="SERIALIZED">SERIALIZED (Unit-level barcode & serial tracking)</option>
                    <option value="QUANTITY">QUANTITY (Bulk meter, roll, piece tracking)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Internal SKU</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="e.g. RAN-RRU-5G-3500"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Equipment Full Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Ericsson Radio 4415 B1/B3"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Manufacturer</label>
                  <input
                    type="text"
                    required
                    value={formMfr}
                    onChange={(e) => setFormMfr(e.target.value)}
                    placeholder="Ericsson, Nokia, Huawei, Cisco..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Model Number</label>
                  <input
                    type="text"
                    required
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    placeholder="e.g. Radio 4415"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Equipment Type / Architecture</label>
                  <input
                    type="text"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    placeholder="e.g. Remote Radio Unit (RRU), Baseband Unit"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Frequency Band / Channels</label>
                  <input
                    type="text"
                    value={formFreq}
                    onChange={(e) => setFormFreq(e.target.value)}
                    placeholder="e.g. 1800/2100 MHz, 3.5 GHz 5G NR"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-400 mb-1 font-medium">Picture Image URL</label>
                  <input
                    type="url"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-400 mb-1 font-medium">Brief Description & Notes</label>
                  <textarea
                    rows={2}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Detailed technical specifications, port configurations, and compatibility notes..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Power Rating (Watts)</label>
                  <input
                    type="number"
                    value={formPower}
                    onChange={(e) => setFormPower(e.target.value)}
                    placeholder="e.g. 460"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    placeholder="e.g. 17.5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Unit Valuation ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formUnitCost}
                    onChange={(e) => setFormUnitCost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Safety Minimum Threshold</label>
                  <input
                    type="number"
                    required
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg shadow-sm"
                >
                  Register Equipment Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
