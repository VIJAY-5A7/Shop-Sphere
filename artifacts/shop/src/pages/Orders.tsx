import { useLocation } from "wouter";
import { useListOrders } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:          { label: "Pending",          color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  confirmed:        { label: "Confirmed",         color: "bg-blue-50 text-blue-700 border-blue-200" },
  processing:       { label: "Processing",        color: "bg-purple-50 text-purple-700 border-purple-200" },
  shipped:          { label: "Shipped",           color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  delivered:        { label: "Delivered",         color: "bg-green-50 text-green-700 border-green-200" },
  cancelled:        { label: "Cancelled",         color: "bg-red-50 text-red-700 border-red-200" },
  return_requested: { label: "Return Requested",  color: "bg-orange-50 text-orange-700 border-orange-200" },
  returned:         { label: "Returned",          color: "bg-gray-50 text-gray-600 border-gray-200" },
};

export function Orders() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useListOrders({ limit: 20 });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  if (!data?.orders.length) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingBag size={64} className="mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
        <p className="text-muted-foreground mb-6">Your orders will appear here once you make a purchase</p>
        <Button onClick={() => setLocation("/shop")}>Start Shopping</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      <div className="space-y-4">
        {data.orders.map(order => {
          const st = STATUS_CONFIG[order.status] ?? { label: order.status, color: "bg-muted text-muted-foreground border" };
          return (
            <div
              key={order.id}
              onClick={() => setLocation(`/orders/${order.id}`)}
              className="bg-card border rounded-xl p-5 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center shrink-0">
                    {order.items[0]?.productImage ? (
                      <img src={order.items[0].productImage} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package size={24} className="text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-1 line-clamp-1">
                      {order.items[0]?.productTitle}
                      {order.items.length > 1 && <span className="text-muted-foreground font-normal"> +{order.items.length - 1} more</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Order #{order.id} · {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p className="text-sm font-bold mt-1">₹{order.total.toLocaleString("en-IN")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${st.color}`}>{st.label}</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
