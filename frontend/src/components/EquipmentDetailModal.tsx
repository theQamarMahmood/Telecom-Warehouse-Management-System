import React, { useState } from 'react';
import {
  X,
  Package,
  Layers,
  Zap,
  Scale,
  Maximize2,
  ShieldCheck,
  Building2,
  MapPin,
  Clock,
  Radio,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { EquipmentItem } from '../types';
import { apiRequest } from '../api';

interface EquipmentDetailModalProps {
  item: EquipmentItem | null;
  onClose: () => void;
  onItemUpdated?: () => void;
}

export const EquipmentDetailModal: React.FC<EquipmentDetailModalProps> = ({ item, onClose, onItemUpdated }) => {
  const [imgError, setImgError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Edit fields
  const [editImageUrl, setEditImageUrl] = useState(item?.image_url || '');
  const [editType, setEditType] = useState(item?.equipment_type || '');
  const [editFreq, setEditFreq] = useState(item?.frequency_band || '');
  const [editPower, setEditPower] = useState(item?.power_consumption_w?.toString() || '');
  const [editWeight, setEditWeight] = useState(item?.weight_kg?.toString() || '');
  const [editDims, setEditDims] = useState(item?.dimensions || '');
  const [editMinStock, setEditMinStock] = useState(item?.min_stock_level?.toString() || '5');

  if (!item) return null;

  const onHand = item.total_on_hand || 0;
  const avail = item.total_available || 0;
  const reserved = item.total_reserved || 0;
  const borrowed = item.total_borrowed || 0;
  const inTransit = item.total_in_transit || 0;
  const damaged = (item.total_damaged || 0) + (item.total_quarantined || 0);

  const isLowStock = onHand <= item.min_stock_level;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      await apiRequest(`/catalogue/items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          image_url: editImageUrl || null,
          equipment_type: editType || null,
          frequency_band: editFreq || null,
          power_consumption_w: editPower ? parseFloat(editPower) : null,
          weight_kg: editWeight ? parseFloat(editWeight) : null,
          dimensions: editDims || null,
          min_stock_level: parseInt(editMinStock) || 5,
        })
      });
      setSaveMsg('Equipment details updated successfully!');
      setTimeout(() => {
        setIsEditing(false);
        setSaveMsg(null);
        if (onItemUpdated) onItemUpdated();
      }, 1000);
    } catch (err: any) {
      setSaveMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded">
                  {item.sku}
                </span>
                <span className="text-xs text-slate-400 font-medium">| {item.category_name}</span>
                {item.equipment_type && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded">
                    {item.equipment_type}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white mt-1 leading-tight">{item.name}</h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Edit Specs & Image</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Edit Form Mode */}
          {isEditing ? (
            <form onSubmit={handleSave} className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Edit3 className="w-4 h-4 text-cyan-400" />
                  <span>Update Equipment Specifications & Media</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {saveMsg && (
                <div className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                  saveMsg.startsWith('Error') ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {saveMsg.startsWith('Error') ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{saveMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Equipment Image URL</label>
                  <input
                    type="url"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Direct image URL for telecom catalog display</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Equipment Type / Architecture</label>
                  <input
                    type="text"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    placeholder="e.g. Remote Radio Unit (RRU), Massive MIMO Antenna"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Operating Frequency / Band</label>
                  <input
                    type="text"
                    value={editFreq}
                    onChange={(e) => setEditFreq(e.target.value)}
                    placeholder="e.g. 1800/2100 MHz, 3.5 GHz 5G NR"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Power Consumption (Watts)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editPower}
                    onChange={(e) => setEditPower(e.target.value)}
                    placeholder="e.g. 460"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    placeholder="e.g. 17.5"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Physical Dimensions</label>
                  <input
                    type="text"
                    value={editDims}
                    onChange={(e) => setEditDims(e.target.value)}
                    placeholder="e.g. 380 x 335 x 135 mm"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Safety Minimum Stock Level</label>
                  <input
                    type="number"
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs"
                >
                  {saving ? 'Saving Changes...' : 'Save Specifications'}
                </button>
              </div>
            </form>
          ) : null}

          {/* Top Section: Photo / Media Showcase & Brief Specs */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Equipment Photo / Media Card */}
            <div className="md:col-span-5 bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden relative group">
              <div className="h-64 w-full bg-slate-900 relative flex items-center justify-center overflow-hidden">
                {item.image_url && !imgError ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <Radio className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-bold text-slate-300">{item.manufacturer}</span>
                    <span className="text-[11px] text-slate-500">{item.model_number}</span>
                  </div>
                )}

                {/* Tracking Badge Overlay */}
                <div className="absolute top-3 left-3 flex flex-col space-y-1">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-md ${
                    item.tracking_mode === 'SERIALIZED'
                      ? 'bg-purple-900/80 text-purple-300 border border-purple-500/50'
                      : 'bg-blue-900/80 text-blue-300 border border-blue-500/50'
                  }`}>
                    {item.tracking_mode === 'SERIALIZED' ? 'Unit Serialized' : 'Bulk / Quantity'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 text-slate-300 border border-slate-700/60 backdrop-blur-md">
                    UOM: {item.unit_of_measure}
                  </span>
                </div>

                {/* Stock Health Overlay */}
                <div className="absolute top-3 right-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md flex items-center space-x-1 ${
                    onHand === 0
                      ? 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
                      : isLowStock
                      ? 'bg-amber-950/80 text-amber-400 border border-amber-800/80'
                      : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      onHand === 0 ? 'bg-rose-400' : isLowStock ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <span>{onHand === 0 ? 'Out of Stock' : isLowStock ? 'Low Safety Stock' : 'In Stock'}</span>
                  </span>
                </div>
              </div>

              {/* Quick Info bar below image */}
              <div className="p-3 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Unit Valuation:</span>
                <span className="font-bold text-emerald-400 text-xs">
                  ${item.unit_cost.toLocaleString()} {item.currency}
                </span>
              </div>
            </div>

            {/* Brief Detail & Technical Specifications */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Equipment Overview & Description</h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
                  {item.description || 'Enterprise telecommunications infrastructure unit.'}
                </p>
              </div>

              {/* Hardware Specifications Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Manufacturer & Model</span>
                  </div>
                  <div className="font-bold text-white text-xs">{item.manufacturer}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.model_number}</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1 mb-1">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Frequency / Bandwidth</span>
                  </div>
                  <div className="font-bold text-white text-xs">{item.frequency_band || 'Standard Carrier Band'}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Part: {item.part_number || 'N/A'}</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1 mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Power Consumption</span>
                  </div>
                  <div className="font-bold text-white text-xs">
                    {item.power_consumption_w !== undefined && item.power_consumption_w > 0
                      ? `${item.power_consumption_w} Watts`
                      : 'Passive (0W)'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Operating Efficiency: 96%+</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1 mb-1">
                    <Scale className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Weight & Dimensions</span>
                  </div>
                  <div className="font-bold text-white text-xs">
                    {item.weight_kg ? `${item.weight_kg} kg` : 'Standard Weight'}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{item.dimensions || 'Standard 19" Rackmount'}</div>
                </div>
              </div>

              {/* Warranty and Barcode Row */}
              <div className="flex items-center justify-between bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50 text-[11px] text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Warranty: <strong className="text-slate-200">{item.warranty_months || 36} Months</strong> Standard</span>
                </span>
                <span className="font-mono text-slate-300">
                  Barcode: <strong className="text-white">{item.barcode || item.sku}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quantity Status Breakdown Bar */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Package className="w-4 h-4 text-cyan-400" />
                  <span>Current Physical Inventory & Allocation Breakdown</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Reconciled inventory quantities across all active branches, project sites, and warehouses.
                </p>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Physical</span>
                  <span className="text-base font-extrabold text-white">{onHand} {item.unit_of_measure}s</span>
                </div>
                <div className="text-right border-l border-slate-800 pl-3">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block">Available to Issue</span>
                  <span className="text-base font-extrabold text-emerald-400">{avail}</span>
                </div>
              </div>
            </div>

            {/* Visual Stock Allocation Progress Bar */}
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
              {avail > 0 && (
                <div
                  style={{ width: `${Math.max(5, (avail / (onHand || 1)) * 100)}%` }}
                  className="bg-emerald-500 h-full transition-all"
                  title={`Available: ${avail}`}
                />
              )}
              {reserved > 0 && (
                <div
                  style={{ width: `${Math.max(5, (reserved / (onHand || 1)) * 100)}%` }}
                  className="bg-amber-500 h-full transition-all"
                  title={`Reserved for BOM: ${reserved}`}
                />
              )}
              {borrowed > 0 && (
                <div
                  style={{ width: `${Math.max(5, (borrowed / (onHand || 1)) * 100)}%` }}
                  className="bg-blue-500 h-full transition-all"
                  title={`Borrowed in Field: ${borrowed}`}
                />
              )}
              {inTransit > 0 && (
                <div
                  style={{ width: `${Math.max(5, (inTransit / (onHand || 1)) * 100)}%` }}
                  className="bg-cyan-500 h-full transition-all"
                  title={`In-Transit: ${inTransit}`}
                />
              )}
              {damaged > 0 && (
                <div
                  style={{ width: `${Math.max(5, (damaged / (onHand || 1)) * 100)}%` }}
                  className="bg-rose-500 h-full transition-all"
                  title={`Quarantined / Damaged: ${damaged}`}
                />
              )}
            </div>

            {/* Pill Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2 text-center">
                <span className="text-[10px] text-slate-400 flex items-center justify-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Available</span>
                </span>
                <span className="font-extrabold text-emerald-400 text-sm mt-0.5 block">{avail}</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2 text-center">
                <span className="text-[10px] text-slate-400 flex items-center justify-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Reserved (BOM)</span>
                </span>
                <span className="font-extrabold text-amber-400 text-sm mt-0.5 block">{reserved}</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2 text-center">
                <span className="text-[10px] text-slate-400 flex items-center justify-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>In Field (Loan)</span>
                </span>
                <span className="font-extrabold text-blue-400 text-sm mt-0.5 block">{borrowed}</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2 text-center">
                <span className="text-[10px] text-slate-400 flex items-center justify-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span>In Transit</span>
                </span>
                <span className="font-extrabold text-cyan-400 text-sm mt-0.5 block">{inTransit}</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2 text-center">
                <span className="text-[10px] text-slate-400 flex items-center justify-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Quarantined</span>
                </span>
                <span className="font-extrabold text-rose-400 text-sm mt-0.5 block">{damaged}</span>
              </div>
            </div>
          </div>

          {/* Warehouse Distribution List */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>Physical Warehouse Locations & Bin Coordinates</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                Stocked in {item.warehouses_stock?.length || 0} facilities
              </span>
            </div>

            {item.warehouses_stock && item.warehouses_stock.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-[10px] text-slate-400 uppercase">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-lg">Facility & Branch</th>
                      <th className="py-2.5 px-3">Storage Bin Coordinates</th>
                      <th className="py-2.5 px-3 text-right">Physical On Hand</th>
                      <th className="py-2.5 px-3 text-right">Available</th>
                      <th className="py-2.5 px-3 text-right">Reserved</th>
                      <th className="py-2.5 px-3 text-right rounded-r-lg">In Transit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {item.warehouses_stock.map((wh) => (
                      <tr key={wh.warehouse_id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{wh.warehouse_name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-cyan-400" />
                            <span>{wh.branch_name} ({wh.cluster_name})</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                          {wh.location_code ? (
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                              {wh.location_code}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Default Receiving Staging</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-white">
                          {wh.quantity_on_hand}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                          {wh.quantity_available}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                          {wh.quantity_reserved}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-cyan-400">
                          {wh.quantity_in_transit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-slate-900/40 rounded-xl text-center text-xs text-slate-500">
                No active physical inventory recorded in any warehouse yet.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Internal SKU: <span className="font-mono text-cyan-400 font-bold">{item.sku}</span> | Last Audited: Active
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
