import { useParams, useLocation } from "wouter";
import { useGetOrder, useCancelOrder, useReturnOrder, getListOrdersQueryKey, getGetOrderQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Package, CheckCircle, Clock, Truck, Home, XCircle, ArrowLeft, RotateCcw } from "lucide-react";

const TIMELINE_STEPS = [
  { key: "pending", label: "Order Placed", icon: Package },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "processing", label: "Processing", icon: Clock },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

const ORDER_STATUS_INDEX: Record<string, number> = {
  pending: 0, confirmed: 1, processing: 2, shipped: 3, delivered: 4,
};

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

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useGetOrder(orderId, { query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId) } });
  const cancelOrder = useCancelOrder();
  const returnOrder = useReturnOrder();

  function handleCancel() {
    if (!confirm("Cancel this order?")) return;
    cancelOrder.mutate(
      { orderId, data: { reason: "Customer requested cancellation" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          toast({ title: "Order cancelled" });
        },
      }
    );
  }

  function handleReturn() {
    if (!confirm("Request a return for this order?")) return;
    returnOrder.mutate(
      { orderId, data: { reason: "Customer requested return", items: order?.items.map(i => i.productId) ?? [] } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          toast({ title: "Return requested" });
        },
      }
    );
  }

  if (isLoading) {
    return <div className="container mx-auto px-4 py-10 space-y-4"><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div>;
  }

  if (!order) return <div className="container mx-auto px-4 py-10 text-center text-muted-foreground">Order not found.</div>;

  const st = STATUS_CONFIG[order.status] ?? { label: order.status, color: "bg-muted text-muted-foreground border" };
  const statusIndex = ORDER_STATUS_INDEX[order.status] ?? -1;
  const isActive = statusIndex >= 0;
  const canCancel = ["pending", "confirmed"].includes(order.status);
  const canReturn = order.status === "delivered";
  const addr = order.shippingAddress as any;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <button onClick={() => setLocation("/orders")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Orders
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.id}</h1>
          <p className="text-sm text-muted-foreground mt-1">{new Date(order.createdAt).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <span className={`text-sm font-semibold px-4 py-1.5 rounded-full border ${st.color}`}>{st.label}</span>
      </div>

      {/* Timeline */}
      {isActive && (
        <div className="bg-card border rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-6">Order Tracking</h2>
          <div className="flex items-start justify-between relative">
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-muted z-0" />
            {TIMELINE_STEPS.map((s, i) => {
              const done = i <= statusIndex;
              const Icon = s.icon;
              return (
                <div key={s.key} className="flex flex-col items-center gap-2 z-10 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${done ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground border-2"}`}>
                    <Icon size={16} />
                  </div>
                  <span className={`text-xs text-center font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
          {order.trackingNumber && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
              <span className="font-medium">Tracking Number:</span> <span className="font-mono text-primary">{order.trackingNumber}</span>
              {order.estimatedDelivery && <span className="ml-4 text-muted-foreground">Est. delivery: {new Date(order.estimatedDelivery).toLocaleDateString("en-IN")}</span>}
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="bg-card border rounded-xl p-6 mb-6">
        <h2 className="font-semibold mb-4">Items Ordered</h2>
        <div className="space-y-4">
          {order.items.map(item => (
            <div key={item.id} className="flex gap-3">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center text-xl font-bold text-primary/30 shrink-0">
                {item.productImage ? (
                  <img src={item.productImage} alt="" className="w-full h-full object-cover rounded-lg" />
                ) : item.productTitle?.[0]}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{item.productTitle}</p>
                {item.variant && <p className="text-xs text-muted-foreground">Variant: {item.variant}</p>}
                <p className="text-sm text-muted-foreground">Qty: {item.quantity} × ₹{item.price.toLocaleString("en-IN")}</p>
              </div>
              <span className="font-semibold text-sm">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
        <Separator className="my-4" />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{order.subtotal.toLocaleString("en-IN")}</span></div>
          {order.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{order.discountAmount.toLocaleString("en-IN")}</span></div>}
          <div className="flex justify-between text-muted-foreground"><span>GST (18%)</span><span>₹{order.gstAmount.toLocaleString("en-IN")}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{order.shippingFee === 0 ? "FREE" : `₹${order.shippingFee}`}</span></div>
          <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{order.total.toLocaleString("en-IN")}</span></div>
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          Payment: <span className="font-medium capitalize">{order.paymentMethod}</span> · Status: <span className={`font-medium ${order.paymentStatus === "paid" ? "text-green-600" : "text-yellow-600"}`}>{order.paymentStatus}</span>
          {order.couponCode && <> · Coupon: <span className="font-mono font-medium text-primary">{order.couponCode}</span></>}
        </div>
      </div>

      {/* Address */}
      {addr && (
        <div className="bg-card border rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><MapPin size={16} /> Delivery Address</h2>
          <p className="font-medium">{addr.name} <span className="text-muted-foreground font-normal text-sm">{addr.phone}</span></p>
          <p className="text-sm text-muted-foreground">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
          <p className="text-sm text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}, {addr.country}</p>
        </div>
      )}

      {/* Actions */}
      {(canCancel || canReturn) && (
        <div className="flex gap-3">
          {canCancel && (
            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={handleCancel} disabled={cancelOrder.isPending}>
              <XCircle size={16} className="mr-2" /> Cancel Order
            </Button>
          )}
          {canReturn && (
            <Button variant="outline" onClick={handleReturn} disabled={returnOrder.isPending}>
              <RotateCcw size={16} className="mr-2" /> Request Return
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
