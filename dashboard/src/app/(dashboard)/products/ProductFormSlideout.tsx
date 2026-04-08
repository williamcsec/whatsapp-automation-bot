'use client';

import { useState } from 'react';
import type { Product } from '@/types/products';
import { supabase } from '@/lib/supabase'; // Create client side client
import { toast } from 'sonner';

interface ProductFormSlideoutProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (products: Product[]) => void;
}

export default function ProductFormSlideout({ isOpen, onClose, onSuccess }: ProductFormSlideoutProps) {
    const [isSaving, setIsSaving] = useState(false);

    // Form fields mapped closely to the DB Schema
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Smartphones');
    const [description, setDescription] = useState('');
    const [condition, setCondition] = useState('new');
    const [dealStatus, setDealStatus] = useState<'none' | 'sale' | 'clearance'>('none');
    const [price, setPrice] = useState('');
    const [costPrice, setCostPrice] = useState(''); // Not in schema directly, we keep it visual or dump in Specs json
    const [sku, setSku] = useState('');
    const [initialStock, setInitialStock] = useState('1');

    // "Keep for next" toggle states
    const [keepCategory, setKeepCategory] = useState(false);
    const [keepCondition, setKeepCondition] = useState(false);
    const [keepDeal, setKeepDeal] = useState(false);
    const [keepTitle, setKeepTitle] = useState(false);
    const [keepDesc, setKeepDesc] = useState(false);
    const [keepSku, setKeepSku] = useState(false);
    const [keepStock, setKeepStock] = useState(false);
    const [keepPrice, setKeepPrice] = useState(false);
    const [keepCost, setKeepCost] = useState(false);

    // Reset handler respects "Keep for next" toggles
    const resetForm = () => {
        if (!keepTitle) setTitle('');
        if (!keepCategory) setCategory('Smartphones');
        if (!keepDesc) setDescription('');
        if (!keepCondition) setCondition('new');
        if (!keepDeal) setDealStatus('none');
        if (!keepPrice) setPrice('');
        if (!keepCost) setCostPrice('');
        if (!keepSku) setSku('');
        if (!keepStock) setInitialStock('1');
    };

    const handleSave = async (isSaveAndNext: boolean = false) => {
        if (!title.trim() || !price || isNaN(Number(price))) {
            toast.error("Title and valid Price are required");
            return;
        }

        const stockCount = parseInt(initialStock, 10);
        if (isNaN(stockCount) || stockCount < 1) {
            toast.error("Valid Initial Stock is required");
            return;
        }

        setIsSaving(true);
        try {
            // Since we're inserting N physical items based on initial stock, we create an array of rows
            const newRows = Array.from({ length: stockCount }).map(() => ({
                client_id: 'default_client', // In a real Multi-tenant app, get from Context
                name: title,
                description,
                price: Number(price),
                category,
                sku: sku || undefined,
                status: 'available',
                condition,
                deal_status: dealStatus,
                cost_price: costPrice ? Number(costPrice) : null,
                specs: {} // Empty for now, generic custom stuff later
            }));

            // Client side insert using anon key. 
            // Note: RLS must allow inserts. If not, this must be an API route. 
            // We'll try the client, if it fails due to RLS, we'll suggest an API route. Let's build it optimistically assuming Dashboard Client RLS allows it.
            const { data, error } = await supabase
                .from('products')
                .insert(newRows)
                .select();

            if (error) {
                console.error("Supabase Error:", error);
                throw error;
            }

            toast.success(`Successfully added ${stockCount} items to inventory.`);
            onSuccess((data || []) as Product[]);

            if (isSaveAndNext) {
                resetForm();
                // Optionally focus back on title
            } else {
                resetForm();
                onClose();
            }

        } catch (error: any) {
            toast.error(error.message || "Failed to add products");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    // Helper Toggle Component for "Keep for next"
    const KeepToggle = ({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) => (
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => onChange(!checked)}>
            <span className="text-[10px] font-medium text-green-700 dark:text-green-400 uppercase tracking-wider bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded transition-opacity" style={{ opacity: checked ? 1 : 0.5 }}>Keep</span>
            <button className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`}></span>
            </button>
        </div>
    );

    return (
        <>
            {/* Backdrop overlay */}
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity" onClick={onClose}></div>

            {/* Slide-out Panel */}
            <div className="fixed inset-y-0 right-0 w-full sm:w-[540px] bg-card shadow-2xl z-50 flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right h-full overflow-hidden border-l border-border">

                {/* Header */}
                <div className="px-6 h-16 shrink-0 border-b border-border flex items-center justify-between bg-secondary/30 backdrop-blur top-0 z-10 sticky">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <span className="material-icons text-primary">add_circle</span> Add New Product
                    </h2>
                    <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* Body Form */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Basic Info Category */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-border">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <span className="material-icons text-muted-foreground text-[18px]">info</span> Basic Information
                            </h3>
                        </div>

                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                            <div className="flex justify-between items-start mb-1">
                                <label className="block text-sm font-medium text-foreground">Product Title <span className="text-destructive">*</span></label>
                                <KeepToggle checked={keepTitle} onChange={setKeepTitle} />
                            </div>
                            <input
                                className="w-full border border-border rounded-lg shadow-sm focus:border-primary focus:ring-primary bg-background text-sm px-3 py-2 outline-none"
                                placeholder="e.g. MacBook Pro M3"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                            <div className="flex justify-between items-start mb-1">
                                <label className="block text-sm font-medium text-foreground">Category</label>
                                <KeepToggle checked={keepCategory} onChange={setKeepCategory} />
                            </div>
                            <select
                                className="w-full border border-border rounded-lg shadow-sm focus:border-primary focus:ring-primary bg-background text-sm px-3 py-2 outline-none"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <option>Smartphones</option>
                                <option>Laptops</option>
                                <option>Audio</option>
                                <option>Wearables</option>
                                <option>Gaming</option>
                            </select>
                        </div>

                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 bg-card">
                            <div className="flex justify-between items-start mb-1">
                                <label className="block text-sm font-medium text-foreground">Description</label>
                                <KeepToggle checked={keepDesc} onChange={setKeepDesc} />
                            </div>
                            <textarea
                                className="w-full border border-border rounded-lg shadow-sm focus:border-primary focus:ring-primary bg-background text-sm px-3 py-2 outline-none resize-none"
                                placeholder="Enter explicit product details..."
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Pricing & Inventory */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-border mt-6">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <span className="material-icons text-muted-foreground text-[18px]">payments</span> Pricing &amp; Inventory
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                                <div className="flex justify-between items-start mb-1">
                                    <label className="block text-sm font-medium text-foreground">Selling Price (₹) <span className="text-destructive">*</span></label>
                                    <KeepToggle checked={keepPrice} onChange={setKeepPrice} />
                                </div>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3 text-muted-foreground font-medium">₹</span>
                                    <input
                                        className="w-full pl-8 pr-3 py-2 border border-border rounded-lg shadow-sm focus:border-primary focus:ring-primary bg-background text-sm outline-none"
                                        placeholder="0"
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                                <div className="flex justify-between items-start mb-1">
                                    <label className="block text-sm font-medium text-foreground">Cost Price (₹)</label>
                                    <KeepToggle checked={keepCost} onChange={setKeepCost} />
                                </div>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3 text-muted-foreground font-medium">₹</span>
                                    <input
                                        className="w-full pl-8 pr-3 py-2 border border-border rounded-lg shadow-sm focus:border-primary focus:ring-primary bg-background text-sm outline-none"
                                        placeholder="0"
                                        type="number"
                                        value={costPrice}
                                        onChange={(e) => setCostPrice(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                                <div className="flex justify-between items-start mb-1">
                                    <label className="block text-sm font-medium text-foreground">SKU (Optional)</label>
                                    <KeepToggle checked={keepSku} onChange={setKeepSku} />
                                </div>
                                <input
                                    className="w-full border border-border rounded-lg shadow-sm focus:border-primary focus:ring-primary bg-background text-sm px-3 py-2 outline-none font-mono"
                                    placeholder="Auto-gen if empty"
                                    type="text"
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                />
                            </div>

                            <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 border-l-4 border-l-orange-400">
                                <div className="flex justify-between items-start mb-1">
                                    <label className="block text-sm font-bold text-foreground">Initial Stock <span className="text-destructive">*</span></label>
                                    <KeepToggle checked={keepStock} onChange={setKeepStock} />
                                </div>
                                <input
                                    className="w-full border border-border rounded-lg shadow-sm focus:border-primary focus:ring-primary bg-background text-sm px-3 py-2 outline-none font-bold text-primary"
                                    type="number"
                                    min="1"
                                    value={initialStock}
                                    onChange={(e) => setInitialStock(e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">Value generates N independent device item rows in database.</p>
                            </div>
                        </div>

                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 mt-4">
                            <div className="flex justify-between items-start mb-3">
                                <label className="block text-sm font-medium text-foreground">Deal Status</label>
                                <KeepToggle checked={keepDeal} onChange={setKeepDeal} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <label className="cursor-pointer">
                                    <input
                                        checked={dealStatus === 'none'}
                                        className="peer sr-only"
                                        name="deal_status"
                                        type="radio"
                                        value="none"
                                        onChange={() => setDealStatus('none')}
                                    />
                                    <div className="text-center px-3 py-2 border border-border rounded-lg peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all text-xs font-medium bg-background flex flex-col items-center justify-center gap-1">
                                        <span className="material-icons text-[16px]">remove_circle_outline</span> Regular
                                    </div>
                                </label>
                                <label className="cursor-pointer">
                                    <input
                                        checked={dealStatus === 'sale'}
                                        className="peer sr-only"
                                        name="deal_status"
                                        type="radio"
                                        value="sale"
                                        onChange={() => setDealStatus('sale')}
                                    />
                                    <div className="text-center px-3 py-2 border border-border rounded-lg peer-checked:border-orange-500 peer-checked:bg-orange-500/10 peer-checked:text-orange-500 transition-all text-xs font-medium bg-background flex flex-col items-center justify-center gap-1">
                                        <span className="material-icons text-[16px]">local_offer</span> Deal
                                    </div>
                                </label>
                                <label className="cursor-pointer">
                                    <input
                                        checked={dealStatus === 'clearance'}
                                        className="peer sr-only"
                                        name="deal_status"
                                        type="radio"
                                        value="clearance"
                                        onChange={() => setDealStatus('clearance')}
                                    />
                                    <div className="text-center px-3 py-2 border border-border rounded-lg peer-checked:border-red-500 peer-checked:bg-red-500/10 peer-checked:text-red-500 transition-all text-xs font-medium bg-background flex flex-col items-center justify-center gap-1">
                                        <span className="material-icons text-[16px]">warning_amber</span> Clearance
                                    </div>
                                </label>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-border bg-secondary/10 mt-auto flex justify-between items-center sticky bottom-0 z-10">
                    <button onClick={onClose} disabled={isSaving} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
                        Cancel
                    </button>

                    <div className="flex gap-2 sm:gap-3">
                        <button
                            onClick={() => handleSave(true)}
                            disabled={isSaving}
                            className="bg-background border border-border hover:bg-secondary text-foreground px-3 sm:px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                        >
                            Save & Add Next
                        </button>
                        <button
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                            className="bg-primary hover:bg-blue-600 text-primary-foreground px-4 sm:px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? "Saving..." : <><span className="material-icons text-[18px]">done_all</span> Submit</>}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
