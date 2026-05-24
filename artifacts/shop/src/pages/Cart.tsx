import { useLocation } from "wouter";
import { useGetCart, useUpdateCartItem, useRemoveCartItem, useClearCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";

export function Cart() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useGetCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const clearCart = useClearCart();

  function handleQuantity(itemId: number, qty: number) {
    if (qty < 1) return;
    updateItem.mutate(
      { itemId, data: { quantity: qty } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }) }
    );
  }

  function handleRemove(itemId: number) {
    removeItem.mutate(
      { itemId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast({ title: "Item removed from cart" });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingBag size={64} className="mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Add some products to get started</p>
        <Button onClick={() => setLocation("/shop")}>Continue Shopping</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart ({cart.itemCount} items)</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map(item => (
            <div key={item.id} className="bg-card border rounded-xl p-4 flex gap-4">
              <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {item.productImage ? (
                  <img src={item.productImage} alt={item.productTitle} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-primary/10 flex items-center justify-center text-primary/40 text-3xl font-bold uppercase">
                    {item.productTitle?.[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1">{item.productTitle}</h3>
                {item.variant && <p className="text-xs text-muted-foreground mb-2">Variant: {item.variant}</p>}
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold">₹{item.finalPrice.toLocaleString("en-IN")}</span>
                  {item.discountPercent > 0 && (
                    <span className="text-xs text-muted-foreground line-through">₹{item.productPrice.toLocaleString("en-IN")}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <button
                      onClick={() => handleQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="px-2 py-1 hover:bg-muted transition-colors disabled:opacity-40"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-3 py-1 text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      className="px-2 py-1 hover:bg-muted transition-colors disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => clearCart.mutate(undefined, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }) })}
          >
            <Trash2 size={14} className="mr-2" /> Clear Cart
          </Button>
        </div>

        {/* Summary */}
        <div className="bg-card border rounded-xl p-6 h-fit sticky top-20">
          <h2 className="font-bold text-lg mb-4">Order Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal ({cart.itemCount} items)</span>
              <span>₹{cart.subtotal.toLocaleString("en-IN")}</span>
            </div>
            {cart.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Product Discount</span>
                <span>-₹{cart.discountAmount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>GST (18%)</span>
              <span>₹{Math.round(cart.total * 0.18).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping</span>
              <span>{cart.total > 499 ? <span className="text-green-600 font-medium">FREE</span> : "₹49"}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>₹{(cart.total + Math.round(cart.total * 0.18) + (cart.total > 499 ? 0 : 49)).toLocaleString("en-IN")}</span>
            </div>
          </div>
          {cart.discountAmount > 0 && (
            <div className="mt-3 p-2 bg-green-50 rounded-lg text-green-700 text-xs font-medium text-center">
              You're saving ₹{cart.discountAmount.toLocaleString("en-IN")} on this order!
            </div>
          )}
          <Button className="w-full mt-6 gap-2" size="lg" onClick={() => setLocation("/checkout")}>
            Proceed to Checkout <ArrowRight size={18} />
          </Button>
          <Button variant="outline" className="w-full mt-3" onClick={() => setLocation("/shop")}>
            Continue Shopping
          </Button>
        </div>
      </div>
    </div>
  );
}
