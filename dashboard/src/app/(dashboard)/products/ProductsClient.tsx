'use client';

import { useState, useMemo } from 'react';
import type { Product } from '@/types/products';
import ProductFormSlideout from './ProductFormSlideout';

export default function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
    const [products, setProducts] = useState(initialProducts);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddFormOpen, setIsAddFormOpen] = useState(false);

    // Grouping logic for "1 row = 1 physical item".
    // We visually group by SKU or name to calculate "Stock".
    const groupedProducts = useMemo(() => {
        const groups: Record<string, { product: Product, stock: number, availableStock: number }> = {};

        products.forEach(p => {
            const key = p.sku || p.name; // Group by SKU preferably, or Name
            if (!groups[key]) {
                groups[key] = { product: p, stock: 0, availableStock: 0 };
            }
            groups[key].stock += 1;
            if (p.status === 'available') {
                groups[key].availableStock += 1;
            }
        });

        const list = Object.values(groups);

        if (searchQuery.trim() !== '') {
            return list.filter(g =>
                g.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (g.product.sku && g.product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        return list;
    }, [products, searchQuery]);

    const handleProductAdded = (newProducts: Product[]) => {
        // Append newly created products directly to state to update UI instantly
        setProducts(prev => [...newProducts, ...prev]);
        setIsAddFormOpen(false); // Can be managed inside the slideout if 'keep open' behaviour is needed
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                    <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between bg-secondary/20">
                        <div className="relative w-full sm:w-96">
                            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors">search</span>
                            <input
                                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground outline-none"
                                placeholder="Search products..."
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button onClick={() => setIsAddFormOpen(true)} className="bg-primary hover:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                <span className="material-icons text-[18px]">add</span> Add Product
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-secondary/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                                    <th className="p-4 w-12 text-center"><input className="rounded border-border text-primary focus:ring-primary bg-background" type="checkbox" /></th>
                                    <th className="p-4">Product Name</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">SKU</th>
                                    <th className="p-4">Price</th>
                                    <th className="p-4">Available Stock</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 w-12 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-sm">
                                {groupedProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                            No products found. Start by adding one to your inventory!
                                        </td>
                                    </tr>
                                ) : (
                                    groupedProducts.map((group, idx) => {
                                        const p = group.product;
                                        const stockLabel = group.availableStock > 10
                                            ? { label: 'In Stock', cls: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' }
                                            : group.availableStock > 0
                                                ? { label: 'Low Stock', cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400' }
                                                : { label: 'Out of Stock', cls: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' };

                                        return (
                                            <tr key={`${p.sku}-${idx}`} className="hover:bg-secondary/50 transition-colors group cursor-pointer">
                                                <td className="p-4 text-center">
                                                    <input onClick={(e) => e.stopPropagation()} className="rounded border-border text-primary focus:ring-primary bg-background" type="checkbox" />
                                                </td>
                                                <td className="p-4 font-medium flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center border border-border overflow-hidden">
                                                        {p.image_url ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-muted-foreground">inventory_2</span>
                                                        )}
                                                    </div>
                                                    <div className="text-foreground">
                                                        {p.name}
                                                        {p.condition && (
                                                            <span className="ml-2 text-[10px] bg-secondary border border-border px-1.5 py-0.5 rounded capitalize font-medium text-muted-foreground">
                                                                {p.condition}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-muted-foreground">{p.category || '-'}</td>
                                                <td className="p-4 text-muted-foreground font-mono text-xs">{p.sku || '-'}</td>
                                                <td className="p-4 font-semibold text-foreground">₹{p.price}</td>
                                                <td className="p-4 font-medium text-foreground">{group.availableStock} <span className="text-muted-foreground font-normal text-xs">/ {group.stock} total</span></td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide border border-current ${stockLabel.cls}`}>
                                                        {stockLabel.label}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button onClick={(e) => { e.stopPropagation(); }} className="text-muted-foreground hover:text-primary">
                                                        <span className="material-icons">more_vert</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {groupedProducts.length > 0 && (
                        <div className="p-4 border-t border-border flex items-center justify-between text-sm bg-secondary/10">
                            <span className="text-muted-foreground">Showing {groupedProducts.length} unique products ({products.length} total items)</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Slideout overlay & Panel */}
            <ProductFormSlideout
                isOpen={isAddFormOpen}
                onClose={() => setIsAddFormOpen(false)}
                onSuccess={handleProductAdded}
            />
        </div>
    );
}
