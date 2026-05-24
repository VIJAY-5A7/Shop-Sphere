import { useState } from "react";
import { useGetSellerDashboard, useListSellerProducts, useListSellerOrders, useShipOrder, useCreateProduct, useDeleteProduct, useListCategories, getListSellerOrdersQueryKey, getListSellerProductsQueryKey, getGetSellerDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, Package, ShoppingBag, Clock, RotateCcw, Plus, Truck, Trash2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-purple-50 text-purple-700 border-purple-200",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const EMPTY_PRODUCT = { title: "", description: "", categoryId: 0, brand: "", price: 0, discountPercent: 0, stock: 0, isFeatured: false, isFlashSale: false };

export function SellerDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading } = useGetSellerDashboard();
  const { data: products } = useListSellerProducts();
  const { data: ordersData } = useListSellerOrders();
  const { data: categories } = useListCategories();

  const shipOrder = useShipOrder();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();

  const [addingProduct, setAddingProduct] = useState(false);
  const [productForm, setProductForm] = useState({ ...EMPTY_PRODUCT });
  const [shippingForm, setShippingForm] = useState<{ orderId: number; trackingNumber: string; carrier: string; estimatedDelivery: string } | null>(null);

  function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    createProduct.mutate(
      { data: { ...productForm, images: [], price: Number(productForm.price), discountPercent: Number(productForm.discountPercent), stock: Number(productForm.stock), categoryId: Number(productForm.categoryId) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSellerProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSellerDashboardQueryKey() });
          setAddingProduct(false);
          setProductForm({ ...EMPTY_PRODUCT });
          toast({ title: "Product created!" });
        },
        onError: () => toast({ variant: "destructive", title: "Failed to create product" }),
      }
    );
  }

  function handleDeleteProduct(id: number) {
    if (!confirm("Delete this product?")) return;
    deleteProduct.mutate(
      { productId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSellerProductsQueryKey() });
          toast({ title: "Product deleted" });
        },
      }
    );
  }

  function handleShip(e: React.FormEvent) {
    e.preventDefault();
    if (!shippingForm) return;
    shipOrder.mutate(
      { orderId: shippingForm.orderId, data: { trackingNumber: shippingForm.trackingNumber, carrier: shippingForm.carrier, estimatedDelivery: shippingForm.estimatedDelivery } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSellerOrdersQueryKey() });
          setShippingForm(null);
          toast({ title: "Order marked as shipped" });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const stats = [
    { label: "Total Revenue", value: `₹${(dashboard?.totalRevenue ?? 0).toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Total Orders", value: dashboard?.totalOrders ?? 0, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Pending Orders", value: dashboard?.pendingOrders ?? 0, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "Products Listed", value: dashboard?.totalProducts ?? 0, icon: Package, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Seller Dashboard</h1>
        <Dialog open={addingProduct} onOpenChange={setAddingProduct}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus size={16} /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateProduct} className="space-y-4 mt-2">
              <div><Label className="text-sm mb-1 block">Title</Label><Input required value={productForm.title} onChange={e => setProductForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><Label className="text-sm mb-1 block">Description</Label><Textarea rows={3} value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm mb-1 block">Category</Label>
                  <Select value={String(productForm.categoryId)} onValueChange={v => setProductForm(f => ({ ...f, categoryId: Number(v) }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-sm mb-1 block">Brand</Label><Input required value={productForm.brand} onChange={e => setProductForm(f => ({ ...f, brand: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-sm mb-1 block">Price (₹)</Label><Input type="number" min={0} required value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: Number(e.target.value) }))} /></div>
                <div><Label className="text-sm mb-1 block">Discount %</Label><Input type="number" min={0} max={90} value={productForm.discountPercent} onChange={e => setProductForm(f => ({ ...f, discountPercent: Number(e.target.value) }))} /></div>
                <div><Label className="text-sm mb-1 block">Stock</Label><Input type="number" min={0} required value={productForm.stock} onChange={e => setProductForm(f => ({ ...f, stock: Number(e.target.value) }))} /></div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={productForm.isFeatured} onChange={e => setProductForm(f => ({ ...f, isFeatured: e.target.checked }))} /> Featured</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={productForm.isFlashSale} onChange={e => setProductForm(f => ({ ...f, isFlashSale: e.target.checked }))} /> Flash Sale</label>
              </div>
              <Button type="submit" className="w-full" disabled={createProduct.isPending}>{createProduct.isPending ? "Creating..." : "Create Product"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-card border rounded-xl p-4">
            <div className={`w-10 h-10 rounded-full ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={20} className={s.color} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      {dashboard?.revenueChart && dashboard.revenueChart.length > 0 && (
        <div className="bg-card border rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-4">Revenue (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dashboard.revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <Tabs defaultValue="orders">
        <TabsList className="mb-4">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="topProducts">Top Products</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <div className="space-y-3">
            {ordersData?.orders.map(order => (
              <div key={order.id} className="bg-card border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm">Order #{order.id}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
                    <p className="text-sm mt-1">{order.items.length} item(s) · <span className="font-semibold">₹{order.total.toLocaleString("en-IN")}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground border"}`}>{order.status}</span>
                    {["confirmed", "processing"].includes(order.status) && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setShippingForm({ orderId: order.id, trackingNumber: "", carrier: "", estimatedDelivery: "" })}>
                        <Truck size={14} /> Ship
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!ordersData?.orders.length && <p className="text-center py-8 text-muted-foreground">No orders yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="products">
          <div className="space-y-3">
            {products?.map(p => (
              <div key={p.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-primary/30 font-bold text-lg">
                    {p.title?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm line-clamp-1">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.brand} · Stock: {p.stock}</p>
                    <p className="text-sm font-bold mt-0.5">₹{p.finalPrice.toLocaleString("en-IN")} {p.discountPercent > 0 && <span className="text-xs text-green-600 font-normal">{p.discountPercent}% off</span>}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.isFeatured && <Badge variant="secondary" className="text-xs">Featured</Badge>}
                  {p.isFlashSale && <Badge className="text-xs bg-red-500">Flash</Badge>}
                  <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => handleDeleteProduct(p.id)}>
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            ))}
            {!products?.length && <p className="text-center py-8 text-muted-foreground">No products listed yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="topProducts">
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-right px-4 py-3 font-medium">Units Sold</th>
                  <th className="text-right px-4 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.topProducts.map((p, i) => (
                  <tr key={p.productId} className="border-t">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</span>
                        {p.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{p.unitsSold}</td>
                    <td className="px-4 py-3 text-right font-semibold">₹{p.revenue.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                {!dashboard?.topProducts.length && (
                  <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">No sales data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Ship Order Dialog */}
      <Dialog open={!!shippingForm} onOpenChange={() => setShippingForm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Mark as Shipped</DialogTitle></DialogHeader>
          {shippingForm && (
            <form onSubmit={handleShip} className="space-y-4 mt-2">
              <div><Label className="text-sm mb-1 block">Tracking Number</Label><Input required value={shippingForm.trackingNumber} onChange={e => setShippingForm(f => f ? { ...f, trackingNumber: e.target.value } : f)} /></div>
              <div><Label className="text-sm mb-1 block">Carrier</Label><Input required placeholder="e.g. Delhivery, Blue Dart" value={shippingForm.carrier} onChange={e => setShippingForm(f => f ? { ...f, carrier: e.target.value } : f)} /></div>
              <div><Label className="text-sm mb-1 block">Estimated Delivery Date</Label><Input type="date" required value={shippingForm.estimatedDelivery} onChange={e => setShippingForm(f => f ? { ...f, estimatedDelivery: e.target.value } : f)} /></div>
              <Button type="submit" className="w-full" disabled={shipOrder.isPending}>{shipOrder.isPending ? "Updating..." : "Confirm Shipment"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
